import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const username = sessionStorage.getItem('username');
const sessionCode = sessionStorage.getItem('sessionCode');

if (!username || !sessionCode) {
    window.location.href = '/';
}

const welcomeHeading = document.getElementById('welcomeHeading');
const sessionCodeDisplay = document.getElementById('sessionCodeDisplay');
const clearButton = document.getElementById('clearCanvasButton');
const canvas = document.getElementById('drawingCanvas');
const connectionLabel = document.getElementById('connectionLabel');
const connectionIndicator = document.getElementById('connectionIndicator');
const statusPill = document.getElementById('connectionStatus');

const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: true });

const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 600;
const MAX_DPR = 3;
const DRAW_BASE_WIDTH = 2.2;
const DEFAULT_STROKE_COLOR = '#111827';

let supabase;
let channel;
let channelReady = false;

let storedPaths = [];
let backgroundImageData = null;
let backgroundImageElement = null;

const drawingState = {
    isDrawing: false,
    pointerId: null,
    buffer: [],
    history: [],
    rafId: null
};

const canvasSize = {
    width: 1,
    height: 1
};

if (welcomeHeading) {
    welcomeHeading.textContent = username ? `Hi, ${username}!` : 'Student canvas';
}

if (sessionCodeDisplay) {
    sessionCodeDisplay.textContent = sessionCode || '----';
}

initialiseCanvas();
setupClearButton();
setupRealtime();

function initialiseCanvas() {
    if (!canvas || !ctx) {
        return;
    }

    canvas.style.touchAction = 'none';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(resizeCanvas);
    });
    resizeObserver.observe(canvas);

    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 150);
    });

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    canvas.addEventListener('pointerleave', handlePointerCancel, { passive: false });

    ['touchstart', 'touchmove', 'gesturestart'].forEach((eventName) => {
        canvas.addEventListener(eventName, preventDefault, { passive: false });
    });

    resizeCanvas();
}

function setupClearButton() {
    if (!clearButton) {
        return;
    }

    clearButton.addEventListener('click', () => {
        clearCanvas({ broadcast: true });
    });
}

function setupRealtime() {
    const supabaseUrl = window.SUPABASE_URL;
    const supabaseAnonKey = window.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        setStatusBadge('Supabase configuration required', 'error');
        return;
    }

    initialiseRealtime().catch((error) => {
        console.error('Failed to initialise realtime connection', error);
        setStatusBadge('Realtime connection error', 'error');
    });
}

async function initialiseRealtime() {
    setStatusBadge('Connecting to Supabase...', 'pending');
    supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
    });

    channel = supabase.channel(`session-${sessionCode}`, {
        config: {
            broadcast: { self: false },
            presence: { key: `student-${username}-${Math.random().toString(36).slice(2, 10)}` }
        }
    });

    wireChannelEvents();

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            channelReady = true;
            setStatusBadge('Connected. Waiting for teacher...', 'pending');

            const { error } = await channel.track({ role: 'student', username });
            if (error) {
                console.error('Failed to register student presence', error);
            }

            announceStudent();
            broadcastCanvas('joined');
        } else if (status === 'CHANNEL_ERROR') {
            setStatusBadge('Realtime connection error', 'error');
        } else if (status === 'TIMED_OUT') {
            setStatusBadge('Supabase connection timed out', 'error');
        } else if (status === 'CLOSED') {
            setStatusBadge('Realtime channel closed', 'error');
        }
    });

    window.addEventListener('beforeunload', () => {
        channel?.unsubscribe();
    });
}

function wireChannelEvents() {
    if (!channel) {
        return;
    }

    channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const teacherOnline = Object.values(presenceState).some((entries) =>
            entries.some((entry) => entry.role === 'teacher'));

        if (teacherOnline) {
            setStatusBadge('Connected to your teacher', 'success');
        } else {
            setStatusBadge('Waiting for your teacher to join...', 'pending');
        }
    });

    channel.on('broadcast', { event: 'teacher_ready' }, () => {
        setStatusBadge('Teacher connected', 'success');
        broadcastCanvas('sync');
    });

    channel.on('broadcast', { event: 'request_canvas' }, ({ payload }) => {
        if (payload?.target === username) {
            broadcastCanvas('sync');
        }
    });

    channel.on('broadcast', { event: 'force_sync' }, () => {
        broadcastCanvas('sync');
    });

    channel.on('broadcast', { event: 'set_background' }, ({ payload }) => {
        const { imageData, target } = payload || {};
        if (target && target !== username) {
            return;
        }

        if (typeof imageData === 'string' && imageData.length > 0) {
            applyBackgroundImage(imageData);
        } else {
            removeBackgroundImage();
        }
    });

    channel.on('broadcast', { event: 'next_question' }, () => {
        handleNextQuestionFromTeacher();
    });

    channel.on('broadcast', { event: 'session_closed' }, ({ payload }) => {
        if (payload?.reason === 'teacher_left') {
            alert('The teacher has ended the session. You will return to the home page.');
            sessionStorage.clear();
            window.location.href = '/';
        }
    });
}

function announceStudent() {
    safeSend('student_ready', { username });
}

function handlePointerDown(event) {
    if (!canvas || !ctx || !isSupportedPointer(event)) {
        return;
    }

    event.preventDefault();

    if (typeof event.pointerId === 'number' && typeof canvas.setPointerCapture === 'function') {
        try {
            canvas.setPointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to capture pointer', error);
        }
    }

    drawingState.isDrawing = true;
    drawingState.pointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    drawingState.buffer = [];
    drawingState.history = [];

    const point = getCanvasPoint(event);
    addPointToStroke(point);
}

function handlePointerMove(event) {
    if (!canvas || !ctx || !drawingState.isDrawing) {
        return;
    }

    if (typeof event.pointerId === 'number' && drawingState.pointerId !== null && event.pointerId !== drawingState.pointerId) {
        return;
    }

    if (!isSupportedPointer(event)) {
        return;
    }

    event.preventDefault();
    addPointToStroke(getCanvasPoint(event));
}

function handlePointerUp(event) {
    if (!canvas || !ctx || !drawingState.isDrawing) {
        return;
    }

    if (typeof event.pointerId === 'number' && drawingState.pointerId !== null && event.pointerId !== drawingState.pointerId) {
        return;
    }

    if (!isSupportedPointer(event)) {
        return;
    }

    event.preventDefault();

    if (typeof event.pointerId === 'number' && typeof canvas.releasePointerCapture === 'function') {
        try {
            canvas.releasePointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to release pointer', error);
        }
    }

    addPointToStroke(getCanvasPoint(event));
    finalizeStroke(false);
}

function handlePointerCancel(event) {
    if (!drawingState.isDrawing) {
        return;
    }

    if (typeof event.pointerId === 'number' && drawingState.pointerId !== null && event.pointerId !== drawingState.pointerId) {
        return;
    }

    event.preventDefault();

    if (typeof event.pointerId === 'number' && typeof canvas.releasePointerCapture === 'function') {
        try {
            canvas.releasePointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to release pointer', error);
        }
    }

    finalizeStroke(true);
}

function addPointToStroke(rawPoint) {
    const point = {
        x: rawPoint.x,
        y: rawPoint.y,
        p: clamp(typeof rawPoint.p === 'number' && rawPoint.p > 0 ? rawPoint.p : 0.5, 0.05, 1)
    };

    drawingState.buffer.push(point);
    drawingState.history.push(point);
    scheduleDraw();
}

function finalizeStroke(cancelled) {
    drawingState.isDrawing = false;
    drawingState.pointerId = null;

    if (cancelled || drawingState.history.length === 0) {
        if (drawingState.rafId !== null) {
            cancelAnimationFrame(drawingState.rafId);
            drawingState.rafId = null;
        }
        drawingState.buffer = [];
        drawingState.history = [];
        return;
    }

    if (drawingState.rafId !== null) {
        cancelAnimationFrame(drawingState.rafId);
        drawingState.rafId = null;
    }
    drawSmoothStroke(true);

    if (drawingState.history.length === 1) {
        drawDot(ctx, drawingState.history[0], DEFAULT_STROKE_COLOR, DRAW_BASE_WIDTH);
    }

    const normalisedPoints = drawingState.history
        .map((point) => normaliseDisplayPoint(point))
        .filter(Boolean);

    if (normalisedPoints.length > 0) {
        storedPaths.push({
            color: DEFAULT_STROKE_COLOR,
            width: DRAW_BASE_WIDTH,
            points: normalisedPoints
        });
        broadcastCanvas('update');
    }

    drawingState.buffer = [];
    drawingState.history = [];
}

function scheduleDraw() {
    if (drawingState.rafId !== null) {
        return;
    }

    drawingState.rafId = requestAnimationFrame(() => {
        drawingState.rafId = null;
        drawSmoothStroke();
    });
}

function drawSmoothStroke(flush = false) {
    if (!ctx) {
        drawingState.buffer = [];
        return;
    }

    const points = drawingState.buffer;
    if (!points || points.length === 0) {
        drawingState.buffer = [];
        return;
    }

    ctx.strokeStyle = DEFAULT_STROKE_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length === 1) {
        drawDot(ctx, points[0], DEFAULT_STROKE_COLOR, DRAW_BASE_WIDTH);
        drawingState.buffer = flush ? [] : points.slice(-1);
        return;
    }

    ctx.beginPath();
    let previous = points[0];
    ctx.moveTo(previous.x, previous.y);

    for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        const midpoint = getMidpoint(previous, current);
        const width = DRAW_BASE_WIDTH * (((previous.p + current.p) * 0.5) + 0.05);

        ctx.lineWidth = width;
        ctx.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
        ctx.stroke();

        previous = current;
    }

    drawingState.buffer = flush ? [] : points.slice(-2);
}

function clearCanvas({ broadcast = false } = {}) {
    storedPaths = [];
    drawingState.buffer = [];
    drawingState.history = [];
    if (drawingState.rafId !== null) {
        cancelAnimationFrame(drawingState.rafId);
        drawingState.rafId = null;
    }
    redrawCanvas();

    if (broadcast) {
        broadcastCanvas('clear');
    }
}

function resizeCanvas() {
    if (!canvas || !ctx) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        return;
    }

    const dpr = Math.max(1, Math.min(MAX_DPR, window.devicePixelRatio || 1));
    canvasSize.width = rect.width;
    canvasSize.height = rect.height;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawCanvas();
}

function redrawCanvas() {
    if (!ctx) {
        return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (backgroundImageElement && backgroundImageElement.complete) {
        drawBackgroundImage(backgroundImageElement);
    }

    storedPaths.forEach((path) => {
        renderStoredPath(path);
    });
}

function drawBackgroundImage(image) {
    if (!ctx) {
        return;
    }

    const displayWidth = canvasSize.width;
    const displayHeight = canvasSize.height;
    if (!displayWidth || !displayHeight) {
        return;
    }

    const canvasRatio = displayWidth / displayHeight;
    const imageRatio = image.width / image.height;

    let drawWidth = displayWidth;
    let drawHeight = displayHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imageRatio > canvasRatio) {
        drawWidth = imageRatio * displayHeight;
        offsetX = (displayWidth - drawWidth) / 2;
    } else {
        drawHeight = displayWidth / imageRatio;
        offsetY = (displayHeight - drawHeight) / 2;
    }

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
}

function renderStoredPath(path) {
    if (!ctx || !path) {
        return;
    }

    const points = normaliseStoredPoints(path.points);
    if (points.length === 0) {
        return;
    }

    const color = path.color || DEFAULT_STROKE_COLOR;
    const baseWidth = typeof path.width === 'number' && path.width > 0 ? path.width : DRAW_BASE_WIDTH;

    if (points.length === 1) {
        drawDot(ctx, points[0], color, baseWidth);
        return;
    }

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    let previous = points[0];
    ctx.moveTo(previous.x, previous.y);

    for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        const midpoint = getMidpoint(previous, current);
        const width = baseWidth * (((previous.p + current.p) * 0.5) + 0.05);

        ctx.lineWidth = width;
        ctx.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
        ctx.stroke();

        previous = current;
    }

    drawDot(ctx, points[points.length - 1], color, baseWidth);
}

function applyBackgroundImage(imageData) {
    backgroundImageData = imageData;
    const image = new Image();
    backgroundImageElement = image;

    image.onload = () => {
        if (backgroundImageElement === image) {
            redrawCanvas();
        }
    };

    image.onerror = () => {
        if (backgroundImageElement === image) {
            backgroundImageData = null;
            backgroundImageElement = null;
            redrawCanvas();
        }
    };

    image.src = imageData;
}

function removeBackgroundImage() {
    if (!backgroundImageData && !backgroundImageElement) {
        return;
    }

    backgroundImageData = null;
    backgroundImageElement = null;
    redrawCanvas();
}

function handleNextQuestionFromTeacher() {
    clearCanvas({ broadcast: false });
    removeBackgroundImage();
    broadcastCanvas('clear');
    setStatusBadge('Teacher started the next question', 'pending');
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return {
        x,
        y,
        p: typeof event.pressure === 'number' && event.pressure > 0 ? event.pressure : 0.5
    };
}

function drawDot(context, point, color, baseWidth) {
    if (!point) {
        return;
    }

    const width = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : DRAW_BASE_WIDTH;
    const radius = clamp(width * (point.p + 0.05), width * 0.45, width * 1.6);

    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
}

function getMidpoint(a, b) {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
}

function normaliseDisplayPoint(point) {
    if (!canvasSize.width || !canvasSize.height) {
        return null;
    }

    const x = clamp((point.x / canvasSize.width) * BASE_CANVAS_WIDTH, 0, BASE_CANVAS_WIDTH);
    const y = clamp((point.y / canvasSize.height) * BASE_CANVAS_HEIGHT, 0, BASE_CANVAS_HEIGHT);

    return [x, y, clamp(point.p, 0.05, 1)];
}

function normaliseStoredPoints(rawPoints) {
    if (!Array.isArray(rawPoints)) {
        return [];
    }

    return rawPoints.map(denormalisePoint).filter(Boolean);
}

function denormalisePoint(raw) {
    let x;
    let y;
    let pressure;

    if (Array.isArray(raw)) {
        [x, y, pressure] = raw;
    } else if (raw && typeof raw === 'object') {
        x = raw.x;
        y = raw.y;
        pressure = raw.p ?? raw.pressure;
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
        return null;
    }

    const displayX = (x / BASE_CANVAS_WIDTH) * canvasSize.width;
    const displayY = (y / BASE_CANVAS_HEIGHT) * canvasSize.height;

    return {
        x: displayX,
        y: displayY,
        p: clamp(typeof pressure === 'number' ? pressure : 0.5, 0.05, 1)
    };
}

function clonePaths(source) {
    if (!Array.isArray(source)) {
        return [];
    }

    return source.map((path) => ({
        color: path.color,
        width: path.width,
        points: Array.isArray(path.points)
            ? path.points.map((point) => (Array.isArray(point) ? [...point] : { ...point }))
            : []
    }));
}

function broadcastCanvas(reason = 'update') {
    if (!channelReady) {
        return;
    }

    const payload = {
        username,
        reason,
        canvasState: {
            paths: clonePaths(storedPaths),
            backgroundImage: backgroundImageData
        }
    };

    safeSend('student_canvas', payload);

    if (reason === 'clear') {
        safeSend('clear', payload);
    }
}

function safeSend(event, payload = {}) {
    if (!channelReady || !channel) {
        return;
    }

    channel.send({ type: 'broadcast', event, payload }).catch((error) => {
        console.error(`Supabase event "${event}" failed`, error);
    });
}

function setStatusBadge(text, variant) {
    if (connectionLabel) {
        connectionLabel.textContent = text;
    }

    if (connectionIndicator) {
        connectionIndicator.classList.remove('status-indicator--success', 'status-indicator--error', 'status-indicator--pending');

        if (variant === 'success') {
            connectionIndicator.classList.add('status-indicator--success');
        } else if (variant === 'error') {
            connectionIndicator.classList.add('status-indicator--error');
        } else {
            connectionIndicator.classList.add('status-indicator--pending');
        }
    }

    if (statusPill) {
        statusPill.classList.remove('student-topbar__status--success', 'student-topbar__status--error', 'student-topbar__status--pending');

        if (variant === 'success') {
            statusPill.classList.add('student-topbar__status--success');
        } else if (variant === 'error') {
            statusPill.classList.add('student-topbar__status--error');
        } else {
            statusPill.classList.add('student-topbar__status--pending');
        }
    }
}

function isSupportedPointer(event) {
    if (!event) {
        return false;
    }

    const type = typeof event.pointerType === 'string' ? event.pointerType.toLowerCase() : '';
    return type === '' || type === 'pen' || type === 'mouse';
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function preventDefault(event) {
    if (event?.preventDefault) {
        event.preventDefault();
    }
}
