import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const username = sessionStorage.getItem('username');
const sessionCode = sessionStorage.getItem('sessionCode');

if (!username || !sessionCode) {
    window.location.href = '/';
}

const welcomeHeading = document.getElementById('welcomeHeading');
const sessionBadge = document.getElementById('sessionStatus');
const sessionCodeDisplay = document.getElementById('sessionCodeDisplay');

if (welcomeHeading) {
    welcomeHeading.textContent = `Hi, ${username}!`;
}
if (sessionCodeDisplay) {
    sessionCodeDisplay.textContent = sessionCode;
}

const canvas = document.getElementById('drawingCanvas');
const canvasPanel = document.getElementById('canvasPanel');
const canvasWrapper = document.getElementById('canvasWrapper');
const canvasToolbar = document.getElementById('canvasToolbar');
const fullscreenToggle = document.getElementById('fullscreenToggle');
const fullscreenEnterIcon = document.getElementById('fullscreenEnterIcon');
const fullscreenExitIcon = document.getElementById('fullscreenExitIcon');
const fullscreenToggleLabel = document.getElementById('fullscreenToggleLabel');
const ctx = canvas.getContext('2d');
const rootElement = document.documentElement;
const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 600;
const colorButtons = Array.from(document.querySelectorAll('.color-btn'));
const toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
const brushSizeInputs = Array.from(document.querySelectorAll('[data-brush-size]'));
const stylusToggleButtons = Array.from(document.querySelectorAll('[data-stylus-toggle]'));
const stylusStatusLabels = Array.from(document.querySelectorAll('[data-stylus-status]'));
const actionButtons = {
    undo: Array.from(document.querySelectorAll('[data-action="undo"]')),
    redo: Array.from(document.querySelectorAll('[data-action="redo"]')),
    clear: Array.from(document.querySelectorAll('[data-action="clear"]'))
};

document.addEventListener('selectstart', preventUnwantedSelection, { passive: false });
document.addEventListener('dragstart', preventUnwantedSelection, { passive: false });
canvas.style.width = '100%';
canvas.style.height = 'auto';
canvas.width = BASE_CANVAS_WIDTH;
canvas.height = BASE_CANVAS_HEIGHT;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let drawMode = 'draw';
let currentColor = '#1e1b4b';
let currentWidth = 5;
let currentPath = null;
let paths = [];
let history = [];
let currentStep = -1;
let backgroundImageData = null;
let backgroundImageElement = null;
let stylusMode = true;
let activePointerId = null;
let viewportZoomLocked = false;
let fullscreenExitRequestedByButton = false;
let reentryScheduled = false;
let hasEverEnteredFullscreen = false;

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

let supabase;
let channel;
let channelReady = false;
const presenceKey = `student-${username}-${Math.random().toString(36).slice(2, 10)}`;

if (!supabaseUrl || !supabaseAnonKey) {
    setStatusBadge('Supabase configuration required', 'error');
} else {
    initialiseRealtime().catch((error) => {
        console.error('Failed to initialise realtime connection', error);
        setStatusBadge('Realtime connection error', 'error');
    });
}

setupControls();
setupFullscreenControls();
initialiseHistory();

function initialiseHistory() {
    currentStep += 1;
    history.push({
        imageData: canvas.toDataURL(),
        paths: [],
        backgroundImage: backgroundImageData
    });
    updateButtons();
}

async function initialiseRealtime() {
    setStatusBadge('Connecting to Supabase...', 'pending');
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
    });

    channel = supabase.channel(`session-${sessionCode}`, {
        config: {
            broadcast: { self: false },
            presence: { key: presenceKey }
        }
    });

    wireChannelEvents();

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            channelReady = true;
            setStatusBadge('Connected. Waiting for teacher...', 'pending');

            const { error } = await channel.track({ role: 'student', username });
            if (error) {
                console.error('Failed to register presence', error);
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
        const { target } = payload || {};
        if (target === username) {
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

        if (typeof imageData !== 'string' || imageData.length === 0) {
            removeBackgroundImage();
            return;
        }

        applyBackgroundImage(imageData);
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

function setupControls() {
    if (!canvas) return;

    lockViewportZoomForIOS();

    canvas.style.touchAction = 'none';
    if (canvasWrapper) {
        canvasWrapper.style.touchAction = 'none';
    }

    if (canvasPanel) {
        canvasPanel.style.touchAction = 'none';
    }

    if (window.PointerEvent) {
        canvas.addEventListener('pointerdown', startDrawing, { passive: false });
        canvas.addEventListener('pointermove', drawStroke, { passive: false });
        canvas.addEventListener('pointerup', stopDrawing, { passive: false });
        canvas.addEventListener('pointercancel', stopDrawing, { passive: false });
        canvas.addEventListener('pointerout', stopDrawing, { passive: false });
    } else {
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', drawStroke);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', drawStroke, { passive: false });
        canvas.addEventListener('touchend', stopDrawing, { passive: false });
        canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
    }

    colorButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!btn.dataset.color) {
                return;
            }
            setActiveColor(btn.dataset.color);
            setTool('draw');
        });
    });

    brushSizeInputs.forEach((input) => {
        input.addEventListener('input', (event) => {
            const value = parseInt(event.target.value, 10) || 5;
            currentWidth = value;
            syncBrushSizeInputs(event.target, value);
        });
    });

    toolButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const { tool } = btn.dataset;
            if (!tool) {
                return;
            }
            setTool(tool);
        });
    });

    actionButtons.clear.forEach((btn) => {
        btn.addEventListener('click', () => {
            paths = [];
            redrawCanvas();
            pushHistory();
            broadcastCanvas('clear');
        });
    });

    actionButtons.undo.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (currentStep <= 0) return;
            currentStep -= 1;
            restoreFromHistory(history[currentStep]);
            broadcastCanvas('undo');
        });
    });

    actionButtons.redo.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (currentStep >= history.length - 1) return;
            currentStep += 1;
            restoreFromHistory(history[currentStep]);
            broadcastCanvas('redo');
        });
    });

    stylusToggleButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            setStylusMode(!stylusMode);
        });
    });

    syncBrushSizeInputs(null, currentWidth);
    setActiveColor(currentColor);
    setTool(drawMode);
    setStylusMode(stylusMode);
}

function setActiveColor(color) {
    if (!color) {
        return;
    }

    currentColor = color;
    updateColorUI();
}

function updateColorUI() {
    colorButtons.forEach((btn) => {
        if (!btn?.dataset?.color) {
            return;
        }

        const isActive = drawMode === 'draw' && btn.dataset.color === currentColor;
        btn.classList.toggle('active', isActive);
    });
}

function syncBrushSizeInputs(sourceInput, value) {
    brushSizeInputs.forEach((input) => {
        if (!input) {
            return;
        }

        if (input !== sourceInput) {
            input.value = value;
        }

        input.setAttribute('aria-valuenow', String(value));
    });
}

function setTool(tool) {
    const nextMode = tool === 'erase' ? 'erase' : 'draw';
    drawMode = nextMode;

    toolButtons.forEach((btn) => {
        if (!btn?.dataset?.tool) {
            return;
        }

        const isActive = btn.dataset.tool === nextMode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });

    if (drawMode === 'draw') {
        updateColorUI();
    } else {
        colorButtons.forEach((btn) => btn.classList.remove('active'));
    }
}

function setStylusMode(enabled) {
    stylusMode = Boolean(enabled);

    stylusToggleButtons.forEach((btn) => {
        if (!btn) {
            return;
        }

        btn.setAttribute('aria-pressed', String(stylusMode));
        btn.classList.toggle('active', stylusMode);
    });

    stylusStatusLabels.forEach((label) => {
        if (label) {
            label.textContent = stylusMode ? 'On' : 'Off';
        }
    });
}

function setupFullscreenControls() {
    if (!canvasPanel || !fullscreenToggle) {
        return;
    }

    fullscreenToggle.addEventListener('click', () => {
        toggleFullscreen();
    });

    const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fullscreenEvents.forEach((eventName) => {
        document.addEventListener(eventName, updateFullscreenUI);
    });

    updateFullscreenUI();
}

function toggleFullscreen() {
    if (isCanvasFullscreen()) {
        fullscreenExitRequestedByButton = true;
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function enterFullscreen() {
    if (!canvasPanel) return;

    const request = canvasPanel.requestFullscreen
        || canvasPanel.webkitRequestFullscreen
        || canvasPanel.mozRequestFullScreen
        || canvasPanel.msRequestFullscreen;

    if (request) {
        try {
            const result = request.call(canvasPanel);
            if (result && typeof result.then === 'function') {
                result.catch((error) => {
                    console.error('Failed to enter fullscreen', error);
                });
            }
        } catch (error) {
            console.error('Failed to enter fullscreen', error);
        }
    }
}

function exitFullscreen() {
    const exit = document.exitFullscreen
        || document.webkitExitFullscreen
        || document.mozCancelFullScreen
        || document.msExitFullscreen;

    if (exit) {
        try {
            const result = exit.call(document);
            if (result && typeof result.then === 'function') {
                result.catch((error) => {
                    console.error('Failed to exit fullscreen', error);
                    fullscreenExitRequestedByButton = false;
                });
            }
        } catch (error) {
            console.error('Failed to exit fullscreen', error);
            fullscreenExitRequestedByButton = false;
        }
    }
}

function updateFullscreenUI() {
    if (!fullscreenToggle) {
        return;
    }

    const isFullscreen = isCanvasFullscreen();

    if (canvasPanel) {
        canvasPanel.classList.toggle('canvas-panel--fullscreen', isFullscreen);
    }

    if (canvasToolbar) {
        canvasToolbar.dataset.fullscreen = String(isFullscreen);
    }

    if (document.body) {
        document.body.classList.toggle('canvas-fullscreen-active', isFullscreen);
    }

    if (rootElement) {
        rootElement.classList.toggle('canvas-fullscreen-active', isFullscreen);
    }

    fullscreenToggle.setAttribute('aria-pressed', String(isFullscreen));
    fullscreenToggle.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
    fullscreenToggle.title = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';

    if (fullscreenToggleLabel) {
        fullscreenToggleLabel.textContent = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
    }

    if (fullscreenEnterIcon) {
        fullscreenEnterIcon.hidden = isFullscreen;
    }

    if (fullscreenExitIcon) {
        fullscreenExitIcon.hidden = !isFullscreen;
    }

    if (isFullscreen) {
        hasEverEnteredFullscreen = true;
    } else {
        if (hasEverEnteredFullscreen && !fullscreenExitRequestedByButton && canvasPanel && !reentryScheduled) {
            reentryScheduled = true;
            requestAnimationFrame(() => {
                reentryScheduled = false;
                enterFullscreen();
            });
        }
        fullscreenExitRequestedByButton = false;
    }
}

function isCanvasFullscreen() {
    const fullscreenElement = document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement
        || document.msFullscreenElement;

    return fullscreenElement === canvasPanel;
}

function startDrawing(event) {
    if (shouldIgnoreEvent(event)) {
        return;
    }

    if (event?.preventDefault) {
        event.preventDefault();
    }

    if (typeof event?.pointerId === 'number') {
        activePointerId = event.pointerId;
        if (typeof canvas.setPointerCapture === 'function') {
            try {
                canvas.setPointerCapture(activePointerId);
            } catch (error) {
                console.warn('Failed to capture pointer', error);
            }
        }
    } else {
        activePointerId = null;
    }

    const { x, y } = getCanvasCoordinates(event);
    isDrawing = true;
    lastX = x;
    lastY = y;

    if (drawMode === 'draw') {
        currentPath = {
            color: currentColor,
            width: currentWidth,
            points: [[x, y]]
        };

        ctx.beginPath();
        ctx.arc(x, y, currentWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();

        sendDrawBatch([{ type: 'dot', x, y, radius: currentWidth / 2, color: currentColor }]);
    } else if (drawMode === 'erase') {
        checkErase(x, y);
    }
}

function drawStroke(event) {
    if (!isDrawing) return;

    if (typeof event?.pointerId === 'number' && activePointerId !== null && event.pointerId !== activePointerId) {
        return;
    }

    if (shouldIgnoreEvent(event)) {
        return;
    }

    if (event?.preventDefault) {
        event.preventDefault();
    }

    const coalesced = typeof event.getCoalescedEvents === 'function'
        ? event.getCoalescedEvents()
        : null;

    const pointerEvents = Array.isArray(coalesced) && coalesced.length > 0
        ? coalesced
        : [event];

    const batch = [];

    pointerEvents.forEach((pointerEvent) => {
        const { x, y } = getCanvasCoordinates(pointerEvent);

        if (drawMode === 'draw' && currentPath) {
            currentPath.points.push([x, y]);

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentWidth;
            ctx.stroke();

            batch.push({
                type: 'line',
                startX: lastX,
                startY: lastY,
                endX: x,
                endY: y,
                width: currentWidth,
                color: currentColor
            });
        } else if (drawMode === 'erase') {
            checkErase(x, y);
        }

        lastX = x;
        lastY = y;
    });

    if (batch.length > 0) {
        sendDrawBatch(batch);
    }
}

function stopDrawing(event) {
    if (!isDrawing) return;

    if (typeof event?.pointerId === 'number' && activePointerId !== null && event.pointerId !== activePointerId) {
        return;
    }

    if (event?.preventDefault) {
        event.preventDefault();
    }

    if (typeof event?.pointerId === 'number' && typeof canvas.releasePointerCapture === 'function') {
        try {
            canvas.releasePointerCapture(event.pointerId);
        } catch (error) {
            console.warn('Failed to release pointer', error);
        }
    }

    isDrawing = false;

    if (drawMode === 'draw' && currentPath) {
        paths.push(currentPath);
        currentPath = null;
        pushHistory();
        broadcastCanvas('update');
    }

    activePointerId = null;
}

function pushHistory() {
    currentStep += 1;
    if (currentStep < history.length) {
        history.length = currentStep;
    }

    history.push({
        imageData: canvas.toDataURL(),
        paths: clonePaths(paths),
        backgroundImage: backgroundImageData
    });

    updateButtons();
}

function restoreFromHistory(historyItem) {
    if (!historyItem) return;

    backgroundImageData = historyItem.backgroundImage || null;
    if (backgroundImageData) {
        backgroundImageElement = new Image();
        backgroundImageElement.src = backgroundImageData;
    } else {
        backgroundImageElement = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
    };
    img.src = historyItem.imageData;
    paths = clonePaths(historyItem.paths);
    updateButtons();
}

function updateButtons() {
    const canUndo = currentStep > 0;
    const canRedo = currentStep < history.length - 1;

    actionButtons.undo.forEach((btn) => {
        if (btn) {
            btn.disabled = !canUndo;
        }
    });

    actionButtons.redo.forEach((btn) => {
        if (btn) {
            btn.disabled = !canRedo;
        }
    });
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundImageElement) {
        if (backgroundImageElement.complete) {
            drawBackgroundImage(backgroundImageElement);
            renderAllPaths();
        } else {
            backgroundImageElement.onload = () => {
                drawBackgroundImage(backgroundImageElement);
                renderAllPaths();
                backgroundImageElement.onload = null;
            };
            backgroundImageElement.onerror = () => {
                renderAllPaths();
                backgroundImageElement.onload = null;
                backgroundImageElement.onerror = null;
            };
            return;
        }
    } else {
        renderAllPaths();
    }
}

function renderAllPaths() {
    paths.forEach((path) => {
        if (path.points.length === 1) {
            const [x, y] = path.points[0];
            ctx.beginPath();
            ctx.arc(x, y, path.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = path.color;
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(path.points[0][0], path.points[0][1]);
            for (let i = 1; i < path.points.length; i += 1) {
                ctx.lineTo(path.points[i][0], path.points[i][1]);
            }
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    });
}

function drawBackgroundImage(image) {
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = image.width / image.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;

    if (imageRatio > canvasRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageRatio;
    } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imageRatio;
    }

    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function applyBackgroundImage(imageData) {
    if (typeof imageData !== 'string' || imageData.length === 0) {
        return;
    }

    if (imageData === backgroundImageData && backgroundImageElement) {
        broadcastCanvas('background');
        setStatusBadge('Reference image refreshed by your teacher', 'success');
        return;
    }

    const img = new Image();
    img.onload = () => {
        backgroundImageData = imageData;
        backgroundImageElement = img;
        redrawCanvas();
        pushHistory();
        broadcastCanvas('background');
        setStatusBadge('Your teacher shared a new reference image', 'success');
    };
    img.onerror = () => {
        console.error('Failed to load background image');
    };
    img.src = imageData;
}

function removeBackgroundImage({ broadcast = true, recordHistory = true, notify = true } = {}) {
    const hadBackground = Boolean(backgroundImageData || backgroundImageElement);

    if (!hadBackground) {
        if (notify) {
            setStatusBadge('Background cleared', 'pending');
        }
        if (broadcast) {
            broadcastCanvas('background');
        }
        return;
    }

    backgroundImageData = null;
    backgroundImageElement = null;
    redrawCanvas();

    if (recordHistory) {
        pushHistory();
    }

    if (broadcast) {
        broadcastCanvas('background');
    }

    if (notify) {
        setStatusBadge('Reference image removed by your teacher', 'pending');
    }
}

function handleNextQuestionFromTeacher() {
    isDrawing = false;
    currentPath = null;
    paths = [];
    history = [];
    currentStep = -1;
    removeBackgroundImage({ broadcast: false, recordHistory: false, notify: false });
    redrawCanvas();
    initialiseHistory();
    broadcastCanvas('clear');
    setStatusBadge('Teacher started the next question', 'pending');
}

function checkErase(x, y) {
    const eraseRadius = currentWidth;
    let erased = false;

    for (let i = paths.length - 1; i >= 0; i -= 1) {
        const path = paths[i];
        if (!path || !Array.isArray(path.points) || path.points.length === 0) {
            continue;
        }

        if (path.points.length === 1) {
            const [pointX, pointY] = path.points[0];
            if (distToSegment(x, y, pointX, pointY, pointX, pointY) <= eraseRadius) {
                paths.splice(i, 1);
                erased = true;
            }
            continue;
        }

        for (let j = 1; j < path.points.length; j += 1) {
            const [x1, y1] = path.points[j - 1];
            const [x2, y2] = path.points[j];

            if (distToSegment(x, y, x1, y1, x2, y2) <= eraseRadius) {
                paths.splice(i, 1);
                erased = true;
                break;
            }
        }
    }

    if (erased) {
        redrawCanvas();
        pushHistory();
        broadcastCanvas('erase');
    }

    return erased;
}

function distToSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx;
    let yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
}

function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = BASE_CANVAS_WIDTH / rect.width;
    const scaleY = BASE_CANVAS_HEIGHT / rect.height;

    if (event.type.includes('touch')) {
        const touch = event.touches[0] || event.changedTouches[0];
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

function shouldIgnoreEvent(event) {
    if (!stylusMode || !event) {
        return false;
    }

    const hasMultipleTouches = Array.isArray(event.touches) && event.touches.length > 1;

    if (typeof event.pointerType === 'string' && event.pointerType !== '') {
        const pointerType = event.pointerType.toLowerCase();

        if (pointerType === 'pen' || pointerType === 'mouse') {
            return false;
        }

        if (pointerType === 'touch') {
            if (hasMultipleTouches || event.isPrimary === false) {
                return true;
            }

            const width = typeof event.width === 'number' ? event.width : null;
            const height = typeof event.height === 'number' ? event.height : null;
            const hasZeroContact = (width !== null && width === 0) || (height !== null && height === 0);
            const averageWidth = width !== null && height !== null
                ? (width + height) / 2
                : (width !== null ? width : height);

            if (averageWidth !== null && averageWidth > 24) {
                return true;
            }

            if (hasZeroContact) {
                return false;
            }

            if (typeof event.pressure === 'number' && event.pressure > 0) {
                return false;
            }

            if (averageWidth !== null && averageWidth <= 18) {
                return false;
            }

            if (averageWidth === null) {
                return false;
            }

            return true;
        }

        return true;
    }

    if (event.type && event.type.includes('touch')) {
        if (hasMultipleTouches) {
            return true;
        }

        const touch = event.touches?.[0] || event.changedTouches?.[0];
        if (!touch) {
            return true;
        }

        if (typeof touch.touchType === 'string') {
            return touch.touchType !== 'stylus';
        }

        if (typeof touch.altitudeAngle === 'number' || typeof touch.azimuthAngle === 'number') {
            return false;
        }

        const radiusX = typeof touch.radiusX === 'number' ? touch.radiusX : null;
        const radiusY = typeof touch.radiusY === 'number' ? touch.radiusY : null;
        const averageRadius = radiusX !== null && radiusY !== null
            ? (radiusX + radiusY) / 2
            : (radiusX !== null ? radiusX : radiusY);

        if (averageRadius !== null && averageRadius > 24) {
            return true;
        }

        if (typeof touch.force === 'number' && touch.force > 0) {
            return false;
        }

        if (averageRadius !== null && averageRadius <= 18) {
            return false;
        }

        return true;
    }

    return false;
}

function lockViewportZoomForIOS() {
    if (viewportZoomLocked) {
        return;
    }

    const userAgent = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
        || (userAgent.includes('Mac') && 'ontouchend' in document);

    if (!isIOS) {
        return;
    }

    const blockMultiTouch = (event) => {
        if (event.touches && event.touches.length > 1) {
            event.preventDefault();
        }
    };

    const blockGesture = (event) => {
        event.preventDefault();
    };

    let lastTouchEnd = 0;
    const blockDoubleTap = (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 350) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    };

    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    document.addEventListener('touchstart', blockMultiTouch, { passive: false });
    document.addEventListener('touchmove', blockMultiTouch, { passive: false });
    document.addEventListener('touchend', blockDoubleTap, { passive: false });

    viewportZoomLocked = true;
}

function clonePaths(source) {
    return JSON.parse(JSON.stringify(source));
}

function preventUnwantedSelection(event) {
    const target = event.target;

    if (!target) {
        return;
    }

    if (target.closest('input, textarea, [contenteditable="true"], [data-allow-selection]')) {
        return;
    }

    if (event?.preventDefault) {
        event.preventDefault();
    }
}

function broadcastCanvas(reason = 'update') {
    if (!channelReady) return;
    const snapshot = clonePaths(paths);
    const payload = {
        username,
        reason,
        canvasState: {
            paths: snapshot,
            backgroundImage: backgroundImageData
        }
    };

    safeSend('student_canvas', payload);

    if (['clear', 'undo', 'redo', 'erase'].includes(reason)) {
        safeSend(reason, payload);
    }
}

function sendDrawBatch(batch) {
    safeSend('draw_batch', {
        username,
        batch
    });
}

function safeSend(event, payload = {}) {
    if (!channelReady || !channel) return;
    channel.send({ type: 'broadcast', event, payload }).catch((error) => {
        console.error(`Supabase event "${event}" failed`, error);
    });
}

function setStatusBadge(text, variant) {
    sessionBadge.textContent = text;
    sessionBadge.classList.remove('status-badge--error', 'status-badge--pending', 'status-badge--success');

    if (variant === 'error') {
        sessionBadge.classList.add('status-badge--error');
    } else if (variant === 'success') {
        sessionBadge.classList.add('status-badge--success');
    } else if (variant === 'pending') {
        sessionBadge.classList.add('status-badge--pending');
    }
}
