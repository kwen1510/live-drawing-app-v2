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
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;
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
initialiseHistory();

function initialiseHistory() {
    currentStep += 1;
    history.push({
        imageData: canvas.toDataURL(),
        paths: []
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
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawStroke);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawStroke, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });

    document.querySelectorAll('.color-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentColor = btn.dataset.color;
            drawMode = 'draw';
            document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('drawBtn').classList.add('active');
            document.getElementById('eraseBtn').classList.remove('active');
        });
    });

    document.getElementById('brushSize').addEventListener('input', (event) => {
        currentWidth = parseInt(event.target.value, 10) || 5;
    });

    document.getElementById('drawBtn').addEventListener('click', () => {
        drawMode = 'draw';
        document.getElementById('drawBtn').classList.add('active');
        document.getElementById('eraseBtn').classList.remove('active');
    });

    document.getElementById('eraseBtn').addEventListener('click', () => {
        drawMode = 'erase';
        document.getElementById('eraseBtn').classList.add('active');
        document.getElementById('drawBtn').classList.remove('active');
        document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        paths = [];
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        pushHistory();
        broadcastCanvas('clear');
    });

    document.getElementById('undoBtn').addEventListener('click', () => {
        if (currentStep <= 0) return;
        currentStep -= 1;
        restoreFromHistory(history[currentStep]);
        broadcastCanvas('undo');
    });

    document.getElementById('redoBtn').addEventListener('click', () => {
        if (currentStep >= history.length - 1) return;
        currentStep += 1;
        restoreFromHistory(history[currentStep]);
        broadcastCanvas('redo');
    });
}

function startDrawing(event) {
    event.preventDefault();
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
    event.preventDefault();

    const { x, y } = getCanvasCoordinates(event);

    if (drawMode === 'draw' && currentPath) {
        currentPath.points.push([x, y]);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        sendDrawBatch([{
            type: 'line',
            startX: lastX,
            startY: lastY,
            endX: x,
            endY: y,
            width: currentWidth,
            color: currentColor
        }]);
    } else if (drawMode === 'erase') {
        checkErase(x, y);
    }

    lastX = x;
    lastY = y;
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;

    if (drawMode === 'draw' && currentPath) {
        paths.push(currentPath);
        currentPath = null;
        pushHistory();
        broadcastCanvas('update');
    }
}

function pushHistory() {
    currentStep += 1;
    if (currentStep < history.length) {
        history.length = currentStep;
    }

    history.push({
        imageData: canvas.toDataURL(),
        paths: clonePaths(paths)
    });

    updateButtons();
}

function restoreFromHistory(historyItem) {
    if (!historyItem) return;

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
    document.getElementById('undoBtn').disabled = currentStep <= 0;
    document.getElementById('redoBtn').disabled = currentStep >= history.length - 1;
}

function redrawCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

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

function clonePaths(source) {
    return JSON.parse(JSON.stringify(source));
}

function broadcastCanvas(reason = 'update') {
    if (!channelReady) return;
    const snapshot = clonePaths(paths);
    const payload = {
        username,
        reason,
        canvasState: {
            paths: snapshot
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
