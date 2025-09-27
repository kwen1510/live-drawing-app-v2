import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const username = sessionStorage.getItem('username');
const sessionCode = sessionStorage.getItem('sessionCode');

if (!username || !sessionCode) {
    window.location.href = '/';
}

const welcomeHeading = document.getElementById('welcomeHeading');
const sessionCodeDisplay = document.getElementById('sessionCodeDisplay');
const clearButton = document.getElementById('clearCanvasButton');
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const stylusButton = document.getElementById('stylusModeButton');
const colorButtons = document.querySelectorAll('[data-color]');
const toolButtons = document.querySelectorAll('[data-tool]');
const canvas = document.getElementById('drawingCanvas');
const studentShellWrap = document.querySelector('.student-shell__wrap');
const studentTopbar = document.querySelector('.student-topbar');
const studentCanvasContainer = document.querySelector('.student-canvas');
const studentCanvasSurface = document.querySelector('.student-canvas__surface');
const connectionLabel = document.getElementById('connectionLabel');
const connectionIndicator = document.getElementById('connectionIndicator');
const statusPill = document.getElementById('connectionStatus');

const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: true });

const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 600;
const MAX_DPR = 3;
const DRAW_BASE_WIDTH = 2.2;
const DEFAULT_STROKE_COLOR = '#111827';
const ERASER_BASE_WIDTH = DRAW_BASE_WIDTH * 5.2;

const RELIABLE_SEQUENCE_STORAGE_KEY = sessionCode
    ? `student-${sessionCode}-last-sequence`
    : 'student-last-sequence';
const RELIABLE_QUESTION_STORAGE_KEY = sessionCode
    ? `student-${sessionCode}-question-number`
    : 'student-question-number';

const TOOL_TYPES = {
    PEN: 'pen',
    ERASER: 'eraser'
};

let supabase;
let channel;
let channelReady = false;

let storedPaths = [];
let historyActions = [];
let redoActions = [];
let backgroundImageData = null;
let backgroundImageElement = null;

const reliableState = {
    lastSequence: readNumericSession(RELIABLE_SEQUENCE_STORAGE_KEY, 0),
    questionNumber: readNumericSession(RELIABLE_QUESTION_STORAGE_KEY, 1)
};

let currentQuestionNumber = reliableState.questionNumber;

const toolState = {
    color: DEFAULT_STROKE_COLOR,
    tool: TOOL_TYPES.PEN,
    stylusOnly: true
};

const drawingState = {
    isDrawing: false,
    pointerId: null,
    buffer: [],
    history: [],
    rafId: null,
    currentStroke: null
};

const eraserState = {
    isErasing: false,
    pointerId: null,
    lastPoint: null,
    currentAction: null
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

setupViewportSizing();
initialiseCanvas();
setupToolbox();
setupClearButton();
setupRealtime();

function setupViewportSizing() {
    if (!studentShellWrap || !studentTopbar || !studentCanvasContainer) {
        return;
    }

    let pendingRaf = null;

    const applyViewportSizing = () => {
        pendingRaf = null;

        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const viewportWidth = window.visualViewport?.width || window.innerWidth;

        studentShellWrap.style.setProperty('--student-viewport-height', `${viewportHeight}px`);
        studentShellWrap.style.setProperty('--student-viewport-width', `${viewportWidth}px`);

        studentShellWrap.style.height = `${viewportHeight}px`;
        studentShellWrap.style.minHeight = `${viewportHeight}px`;

        const topbarHeight = studentTopbar.offsetHeight;
        const availableHeight = Math.max(0, viewportHeight - topbarHeight);

        studentCanvasContainer.style.height = `${availableHeight}px`;
        studentCanvasContainer.style.minHeight = `${availableHeight}px`;
        studentCanvasContainer.style.maxHeight = `${availableHeight}px`;

        if (studentCanvasSurface) {
            studentCanvasSurface.style.height = '100%';
            studentCanvasSurface.style.minHeight = '0px';
            studentCanvasSurface.style.maxHeight = '100%';
        }

        requestAnimationFrame(resizeCanvas);
    };

    const queueViewportSizing = () => {
        if (pendingRaf !== null) {
            cancelAnimationFrame(pendingRaf);
        }
        pendingRaf = requestAnimationFrame(applyViewportSizing);
    };

    queueViewportSizing();

    const topbarResizeObserver = new ResizeObserver(queueViewportSizing);
    topbarResizeObserver.observe(studentTopbar);

    window.addEventListener('resize', queueViewportSizing);

    window.addEventListener('orientationchange', () => {
        setTimeout(queueViewportSizing, 150);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', queueViewportSizing, { passive: true });
        window.visualViewport.addEventListener('scroll', queueViewportSizing, { passive: true });
    }
}

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

function setupToolbox() {
    initialiseColorPalette();
    initialiseToolButtons();
    initialiseHistoryButtons();
    initialiseStylusButton();
}

function setupClearButton() {
    if (!clearButton) {
        return;
    }

    clearButton.addEventListener('click', () => {
        clearCanvas({ broadcast: true });
    });
}

function initialiseColorPalette() {
    if (!colorButtons || colorButtons.length === 0) {
        return;
    }

    colorButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const color = button.dataset.color;
            if (typeof color === 'string' && color.trim().length > 0) {
                toolState.color = color;
                if (toolState.tool !== TOOL_TYPES.PEN) {
                    toolState.tool = TOOL_TYPES.PEN;
                    updateToolSelection();
                }
                updateColorSelection();
            }
        });
    });

    updateColorSelection();
}

function initialiseToolButtons() {
    if (!toolButtons || toolButtons.length === 0) {
        return;
    }

    toolButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const tool = button.dataset.tool;
            if (tool === TOOL_TYPES.PEN || tool === TOOL_TYPES.ERASER) {
                toolState.tool = tool;
                updateToolSelection();
                if (tool === TOOL_TYPES.PEN) {
                    updateColorSelection();
                }
            }
        });
    });

    updateToolSelection();
}

function initialiseHistoryButtons() {
    if (undoButton) {
        undoButton.addEventListener('click', () => {
            undoLastAction();
        });
    }

    if (redoButton) {
        redoButton.addEventListener('click', () => {
            redoLastAction();
        });
    }

    updateHistoryButtons();
}

function initialiseStylusButton() {
    if (!stylusButton) {
        return;
    }

    stylusButton.addEventListener('click', () => {
        toolState.stylusOnly = !toolState.stylusOnly;
        updateStylusModeButton();
    });

    updateStylusModeButton();
}

function updateColorSelection() {
    if (!colorButtons) {
        return;
    }

    colorButtons.forEach((button) => {
        const isActive = button.dataset.color === toolState.color;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function updateToolSelection() {
    if (!toolButtons) {
        return;
    }

    toolButtons.forEach((button) => {
        const isActive = button.dataset.tool === toolState.tool;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function updateStylusModeButton() {
    if (!stylusButton) {
        return;
    }

    stylusButton.classList.toggle('is-active', toolState.stylusOnly);
    stylusButton.setAttribute('aria-pressed', toolState.stylusOnly ? 'true' : 'false');
    stylusButton.textContent = toolState.stylusOnly ? 'Stylus mode (pen only)' : 'Stylus mode';
    stylusButton.setAttribute(
        'title',
        toolState.stylusOnly ? 'Stylus and mouse input only' : 'Allow pen, touch and mouse input'
    );
}

function updateHistoryButtons() {
    if (undoButton) {
        undoButton.disabled = historyActions.length === 0;
    }

    if (redoButton) {
        redoButton.disabled = redoActions.length === 0;
    }
}

function normaliseEraseEntries(action) {
    if (!action) {
        return [];
    }

    if (Array.isArray(action.entries)) {
        return action.entries
            .filter((entry) => entry && entry.path)
            .map((entry) => ({
                path: entry.path,
                index: typeof entry.index === 'number' ? entry.index : storedPaths.length
            }));
    }

    if (action.path) {
        return [{
            path: action.path,
            index: typeof action.index === 'number' ? action.index : storedPaths.length
        }];
    }

    return [];
}

function undoLastAction() {
    if (historyActions.length === 0) {
        return;
    }

    const action = historyActions.pop();

    if (action.type === 'draw') {
        const targetIndex = storedPaths.lastIndexOf(action.path);
        let removed = null;
        if (targetIndex !== -1) {
            [removed] = storedPaths.splice(targetIndex, 1);
        } else if (storedPaths.length > 0) {
            removed = storedPaths.pop();
        }

        if (removed) {
            redoActions.push({ type: 'draw', path: removed });
        }
    } else if (action.type === 'erase') {
        const entries = normaliseEraseEntries(action);
        if (entries.length > 0) {
            for (let i = entries.length - 1; i >= 0; i -= 1) {
                const entry = entries[i];
                const insertIndex = clamp(entry.index, 0, storedPaths.length);
                storedPaths.splice(insertIndex, 0, entry.path);
            }

            redoActions.push({
                type: 'erase',
                entries: entries.map((entry) => ({ path: entry.path, index: entry.index }))
            });
        }
    }

    redrawCanvas();
    updateHistoryButtons();
    broadcastCanvas('update');
}

function redoLastAction() {
    if (redoActions.length === 0) {
        return;
    }

    const action = redoActions.pop();

    if (action.type === 'draw') {
        if (action.path) {
            storedPaths.push(action.path);
            historyActions.push({ type: 'draw', path: action.path });
        }
    } else if (action.type === 'erase') {
        const entries = normaliseEraseEntries(action);
        const performed = [];

        entries.forEach((entry) => {
            if (!entry.path) {
                return;
            }

            const targetIndex = storedPaths.indexOf(entry.path);
            if (targetIndex !== -1) {
                const [removed] = storedPaths.splice(targetIndex, 1);
                if (removed) {
                    performed.push({ path: removed, index: targetIndex });
                }
            } else if (typeof entry.index === 'number' && entry.index >= 0 && entry.index < storedPaths.length) {
                const [removed] = storedPaths.splice(entry.index, 1);
                if (removed) {
                    performed.push({ path: removed, index: entry.index });
                }
            }
        });

        if (performed.length > 0) {
            historyActions.push({ type: 'erase', entries: performed });
        }
    }

    redrawCanvas();
    updateHistoryButtons();
    broadcastCanvas('update');
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
            requestSessionState();
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
        requestSessionState();
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
        handleTeacherBackgroundEvent(payload);
    });

    channel.on('broadcast', { event: 'next_question' }, ({ payload }) => {
        handleTeacherNextQuestionEvent(payload);
    });

    channel.on('broadcast', { event: 'session_state' }, ({ payload }) => {
        processSessionState(payload);
    });

    channel.on('broadcast', { event: 'session_closed' }, ({ payload }) => {
        if (payload?.reason === 'teacher_left') {
            alert('The teacher has ended the session. You will return to the home page.');
            sessionStorage.clear();
            window.location.href = '/';
        }
    });
}

function requestSessionState() {
    if (!channelReady) {
        return;
    }

    safeSend('session_state_request', {
        username,
        lastSequence: reliableState.lastSequence
    });
}

function handleTeacherBackgroundEvent(payload = {}) {
    const { target } = payload || {};
    if (target && target !== username) {
        return;
    }

    if (!trackReliableSequence(payload)) {
        return;
    }

    const { imageData } = payload;
    if (typeof imageData === 'string' && imageData.length > 0) {
        applyBackgroundImage(imageData);
    } else {
        removeBackgroundImage();
    }
}

function handleTeacherNextQuestionEvent(payload = {}) {
    const isNew = trackReliableSequence(payload);
    if (!isNew) {
        return;
    }

    const { questionNumber } = payload || {};
    const nextNumber = typeof questionNumber === 'number' && Number.isFinite(questionNumber)
        ? questionNumber
        : reliableState.questionNumber + 1;

    handleNextQuestionFromTeacher(nextNumber);
}

function processSessionState(payload = {}) {
    const { target, events, snapshot } = payload || {};

    if (target && target !== username) {
        return;
    }

    let snapshotSequence = null;

    if (snapshot) {
        const { questionNumber, lastSequence } = snapshot;
        if (typeof questionNumber === 'number' && Number.isFinite(questionNumber)) {
            if (questionNumber > reliableState.questionNumber) {
                updateQuestionNumber(questionNumber);
            }
        }

        if (typeof lastSequence === 'number' && Number.isFinite(lastSequence)) {
            snapshotSequence = lastSequence;
        }
    }

    if (Array.isArray(events) && events.length > 0) {
        const sortedEvents = [...events].sort((a, b) => {
            const aId = typeof a?.id === 'number' ? a.id : 0;
            const bId = typeof b?.id === 'number' ? b.id : 0;
            return aId - bId;
        });

        sortedEvents.forEach((entry) => {
            applyReliableEvent(entry);
        });
    }

    if (snapshotSequence !== null) {
        updateReliableSequence(snapshotSequence);
    }
}

function applyReliableEvent(entry) {
    if (!entry || typeof entry.id !== 'number' || !entry.event) {
        return;
    }

    if (entry.id <= reliableState.lastSequence) {
        return;
    }

    const payload = entry.payload ? { ...entry.payload, __seq: entry.id } : { __seq: entry.id };

    if (entry.event === 'set_background') {
        handleTeacherBackgroundEvent(payload);
    } else if (entry.event === 'next_question') {
        handleTeacherNextQuestionEvent(payload);
    }
}

function announceStudent() {
    safeSend('student_ready', { username });
}

function handlePointerDown(event) {
    if (!canvas || !ctx || !isSupportedPointer(event)) {
        return;
    }

    event.preventDefault();

    if (toolState.tool === TOOL_TYPES.ERASER) {
        startErasing(event);
        return;
    }

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
    drawingState.currentStroke = getCurrentStrokeSettings();

    const point = getCanvasPoint(event);
    addPointToStroke(point);
}

function handlePointerMove(event) {
    if (!canvas || !ctx) {
        return;
    }

    if (toolState.tool === TOOL_TYPES.ERASER) {
        handleEraserMove(event);
        return;
    }

    if (!drawingState.isDrawing) {
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
    if (!canvas || !ctx) {
        return;
    }

    if (toolState.tool === TOOL_TYPES.ERASER) {
        finishErasing(event);
        return;
    }

    if (!drawingState.isDrawing) {
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
    if (!canvas || !ctx) {
        return;
    }

    if (toolState.tool === TOOL_TYPES.ERASER) {
        cancelErasing(event);
        return;
    }

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

function eraseStrokeAtPoint(point) {
    if (!point || !canvas || !ctx) {
        return;
    }

    const strokeIndex = findStrokeIndexAtPoint(point);
    if (strokeIndex === -1) {
        return;
    }

    const [removed] = storedPaths.splice(strokeIndex, 1);
    if (!removed) {
        return;
    }

    if (eraserState.currentAction && Array.isArray(eraserState.currentAction.entries)) {
        eraserState.currentAction.entries.push({ path: removed, index: strokeIndex });
    } else {
        historyActions.push({ type: 'erase', entries: [{ path: removed, index: strokeIndex }] });
        updateHistoryButtons();
    }

    redoActions = [];
    redrawCanvas();
    broadcastCanvas('update');
}

function startErasing(event) {
    if (typeof event.pointerId === 'number' && typeof canvas.setPointerCapture === 'function') {
        try {
            canvas.setPointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to capture pointer for eraser', error);
        }
    }

    eraserState.isErasing = true;
    eraserState.pointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    eraserState.currentAction = { type: 'erase', entries: [] };
    const point = getCanvasPoint(event);
    eraserState.lastPoint = point;
    eraseStrokeAtPoint(point);
}

function handleEraserMove(event) {
    if (!eraserState.isErasing) {
        return;
    }

    if (typeof event.pointerId === 'number' && eraserState.pointerId !== null && event.pointerId !== eraserState.pointerId) {
        return;
    }

    if (!isSupportedPointer(event)) {
        return;
    }

    event.preventDefault();

    const point = getCanvasPoint(event);
    eraseAlongPath(eraserState.lastPoint, point);
    eraserState.lastPoint = point;
}

function finishErasing(event) {
    if (!eraserState.isErasing) {
        return;
    }

    if (typeof event.pointerId === 'number' && eraserState.pointerId !== null && event.pointerId !== eraserState.pointerId) {
        return;
    }

    event.preventDefault();

    if (typeof event.pointerId === 'number' && typeof canvas.releasePointerCapture === 'function') {
        try {
            canvas.releasePointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to release pointer for eraser', error);
        }
    }

    if (eraserState.lastPoint) {
        eraseStrokeAtPoint(eraserState.lastPoint);
    }

    finalizeEraseAction();
    resetEraserState();
}

function cancelErasing(event) {
    if (!eraserState.isErasing) {
        return;
    }

    if (event?.preventDefault) {
        event.preventDefault();
    }

    if (typeof event?.pointerId === 'number' && typeof canvas.releasePointerCapture === 'function') {
        try {
            canvas.releasePointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to release pointer for eraser cancel', error);
        }
    }

    finalizeEraseAction();
    resetEraserState();
}

function resetEraserState() {
    eraserState.isErasing = false;
    eraserState.pointerId = null;
    eraserState.lastPoint = null;
    eraserState.currentAction = null;
}

function finalizeEraseAction() {
    const current = eraserState.currentAction;
    if (!current || !Array.isArray(current.entries) || current.entries.length === 0) {
        return;
    }

    const entries = current.entries.filter((entry) => entry && entry.path);
    if (entries.length === 0) {
        return;
    }

    historyActions.push({ type: 'erase', entries });
    updateHistoryButtons();
}

function eraseAlongPath(startPoint, endPoint) {
    if (!endPoint) {
        return;
    }

    if (!startPoint) {
        eraseStrokeAtPoint(endPoint);
        return;
    }

    const distance = distanceBetweenPoints(startPoint, endPoint);
    const stepSize = Math.max(ERASER_BASE_WIDTH * 0.45, 6);
    const steps = Math.max(1, Math.ceil(distance / stepSize));

    for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        eraseStrokeAtPoint({
            x: startPoint.x + (endPoint.x - startPoint.x) * t,
            y: startPoint.y + (endPoint.y - startPoint.y) * t,
            p: endPoint.p
        });
    }
}

function findStrokeIndexAtPoint(point) {
    for (let i = storedPaths.length - 1; i >= 0; i -= 1) {
        const path = storedPaths[i];
        if (!path || !Array.isArray(path.points)) {
            continue;
        }

        const points = normaliseStoredPoints(path.points);
        if (points.length === 0) {
            continue;
        }

        const baseWidth = getStrokeBaseWidth(path);
        const hitPadding = Math.max(baseWidth * 0.6, 6);

        if (points.length === 1) {
            const radius = clamp(baseWidth * (points[0].p + 0.05), baseWidth * 0.45, baseWidth * 1.6);
            if (distanceBetweenPoints(point, points[0]) <= radius + hitPadding) {
                return i;
            }
            continue;
        }

        for (let j = 1; j < points.length; j += 1) {
            const previous = points[j - 1];
            const current = points[j];
            const strokeWidth = getStrokeWidthForSegment(baseWidth, previous, current);
            const distance = distanceToSegment(point, previous, current);

            if (distance <= strokeWidth * 0.6 + hitPadding) {
                return i;
            }
        }
    }

    return -1;
}

function getStrokeBaseWidth(path) {
    return typeof path.width === 'number' && path.width > 0 ? path.width : DRAW_BASE_WIDTH;
}

function getStrokeWidthForSegment(baseWidth, a, b) {
    const averagePressure = ((a.p ?? 0.5) + (b.p ?? 0.5)) * 0.5;
    return baseWidth * (averagePressure + 0.05);
}

function distanceBetweenPoints(a, b) {
    if (!a || !b) {
        return Number.POSITIVE_INFINITY;
    }
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function distanceToSegment(point, start, end) {
    if (!point || !start || !end) {
        return Number.POSITIVE_INFINITY;
    }

    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const wx = point.x - start.x;
    const wy = point.y - start.y;

    const segmentLengthSquared = vx * vx + vy * vy;
    if (segmentLengthSquared === 0) {
        return distanceBetweenPoints(point, start);
    }

    let t = (wx * vx + wy * vy) / segmentLengthSquared;
    t = clamp(t, 0, 1);

    const closestX = start.x + t * vx;
    const closestY = start.y + t * vy;
    const dx = point.x - closestX;
    const dy = point.y - closestY;

    return Math.hypot(dx, dy);
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
        drawingState.currentStroke = null;
        return;
    }

    if (drawingState.rafId !== null) {
        cancelAnimationFrame(drawingState.rafId);
        drawingState.rafId = null;
    }
    drawSmoothStroke(true);

    const stroke = drawingState.currentStroke || getCurrentStrokeSettings();

    if (drawingState.history.length === 1) {
        drawDot(ctx, drawingState.history[0], stroke);
    }

    const normalisedPoints = drawingState.history
        .map((point) => normaliseDisplayPoint(point))
        .filter(Boolean);

    if (normalisedPoints.length > 0) {
        const storedPath = {
            color: stroke.color || DEFAULT_STROKE_COLOR,
            width: typeof stroke.width === 'number' && stroke.width > 0 ? stroke.width : DRAW_BASE_WIDTH,
            erase: Boolean(stroke.erase),
            points: normalisedPoints
        };
        storedPaths.push(storedPath);
        historyActions.push({ type: 'draw', path: storedPath });
        redoActions = [];
        updateHistoryButtons();
        broadcastCanvas('update');
    }

    drawingState.buffer = [];
    drawingState.history = [];
    drawingState.currentStroke = null;
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

    const stroke = drawingState.currentStroke || getCurrentStrokeSettings();
    const baseWidth = typeof stroke.width === 'number' && stroke.width > 0 ? stroke.width : DRAW_BASE_WIDTH;
    const strokeColor = stroke.erase ? '#000000' : (stroke.color || DEFAULT_STROKE_COLOR);
    ctx.save();
    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length === 1) {
        drawDot(ctx, points[0], stroke);
        ctx.restore();
        drawingState.buffer = flush ? [] : points.slice(-1);
        return;
    }

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

    drawingState.buffer = flush ? [] : points.slice(-2);
    ctx.restore();
}

function clearCanvas({ broadcast = false } = {}) {
    storedPaths = [];
    historyActions = [];
    redoActions = [];
    drawingState.buffer = [];
    drawingState.history = [];
    if (drawingState.rafId !== null) {
        cancelAnimationFrame(drawingState.rafId);
        drawingState.rafId = null;
    }
    drawingState.currentStroke = null;
    redrawCanvas();
    updateHistoryButtons();

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

    ctx.globalCompositeOperation = 'source-over';
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

    const stroke = {
        color: path.color || DEFAULT_STROKE_COLOR,
        width: typeof path.width === 'number' && path.width > 0 ? path.width : DRAW_BASE_WIDTH,
        erase: Boolean(path.erase)
    };

    ctx.save();
    if (points.length === 1) {
        drawDot(ctx, points[0], stroke);
        ctx.restore();
        return;
    }

    ctx.strokeStyle = stroke.erase ? '#000000' : stroke.color;
    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    let previous = points[0];
    ctx.moveTo(previous.x, previous.y);

    for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        const midpoint = getMidpoint(previous, current);
        const width = stroke.width * (((previous.p + current.p) * 0.5) + 0.05);

        ctx.lineWidth = width;
        ctx.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
        ctx.stroke();

        previous = current;
    }

    drawDot(ctx, points[points.length - 1], stroke);
    ctx.restore();
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

function handleNextQuestionFromTeacher(nextQuestionNumber = null) {
    if (typeof nextQuestionNumber === 'number' && Number.isFinite(nextQuestionNumber)) {
        if (nextQuestionNumber > reliableState.questionNumber) {
            updateQuestionNumber(nextQuestionNumber);
        } else if (nextQuestionNumber !== reliableState.questionNumber) {
            updateQuestionNumber(nextQuestionNumber);
        }
    } else {
        updateQuestionNumber(reliableState.questionNumber + 1);
    }

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

function getCurrentStrokeSettings() {
    if (toolState.tool === TOOL_TYPES.ERASER) {
        return {
            color: '#000000',
            width: ERASER_BASE_WIDTH,
            erase: true
        };
    }

    return {
        color: toolState.color || DEFAULT_STROKE_COLOR,
        width: DRAW_BASE_WIDTH,
        erase: false
    };
}

function drawDot(context, point, stroke) {
    if (!point || !stroke) {
        return;
    }

    const baseWidth = typeof stroke.width === 'number' && stroke.width > 0 ? stroke.width : DRAW_BASE_WIDTH;
    const radius = clamp(baseWidth * (point.p + 0.05), baseWidth * 0.45, baseWidth * 1.6);

    context.save();
    context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = stroke.erase ? '#000000' : (stroke.color || DEFAULT_STROKE_COLOR);
    context.fill();
    context.restore();
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
        erase: Boolean(path.erase),
        points: Array.isArray(path.points)
            ? path.points.map((point) => (Array.isArray(point) ? [...point] : { ...point }))
            : []
    }));
}

function trackReliableSequence(payload = {}) {
    if (!payload || typeof payload !== 'object') {
        return true;
    }

    const sequence = Number(payload.__seq);
    if (!Number.isFinite(sequence)) {
        return true;
    }

    if (sequence <= reliableState.lastSequence) {
        return false;
    }

    updateReliableSequence(sequence);
    return true;
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

function readNumericSession(key, fallback = 0) {
    try {
        const stored = sessionStorage.getItem(key);
        if (stored === null || stored === undefined) {
            return fallback;
        }

        const value = Number(stored);
        return Number.isFinite(value) ? value : fallback;
    } catch (_error) {
        return fallback;
    }
}

function updateReliableSequence(sequence) {
    if (typeof sequence !== 'number' || !Number.isFinite(sequence)) {
        return;
    }

    if (sequence <= reliableState.lastSequence) {
        return;
    }

    reliableState.lastSequence = sequence;

    try {
        sessionStorage.setItem(RELIABLE_SEQUENCE_STORAGE_KEY, String(sequence));
    } catch (_error) {
        // Ignore storage write failures (e.g., private browsing)
    }
}

function updateQuestionNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return;
    }

    if (value <= 0) {
        return;
    }

    reliableState.questionNumber = value;
    currentQuestionNumber = value;

    try {
        sessionStorage.setItem(RELIABLE_QUESTION_STORAGE_KEY, String(value));
    } catch (_error) {
        // Ignore storage write failures
    }
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
    if (toolState.stylusOnly) {
        return type === '' || type === 'pen' || type === 'mouse';
    }

    return type === '' || type === 'pen' || type === 'mouse' || type === 'touch';
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function preventDefault(event) {
    if (event?.preventDefault) {
        event.preventDefault();
    }
}
