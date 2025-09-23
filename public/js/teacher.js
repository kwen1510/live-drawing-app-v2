import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const statusBadge = document.getElementById('sessionStatusBadge');
const connectionStatus = document.getElementById('connection-status');
const studentGrid = document.getElementById('studentGrid');
const sessionCodeEl = document.getElementById('sessionCode');
const sessionUrlInput = document.getElementById('sessionUrl');
const copyBtn = document.getElementById('copyBtn');

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    showConfigurationError();
} else {
    initialiseTeacherConsole().catch((error) => {
        console.error('Failed to initialise teacher console', error);
        setStatusBadge('Something went wrong', 'error');
    });
}

let supabase;
let channel;
let channelReady = false;
let sessionCode = '';
let syncInterval = null;
const presenceKey = `teacher-${Math.random().toString(36).slice(2, 10)}`;
const students = new Map();

async function initialiseTeacherConsole() {
    setStatusBadge('Connecting to Supabase...', 'pending');
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
    });

    sessionCode = generateSessionCode();
    sessionCodeEl.textContent = sessionCode;

    const baseUrl = window.location.origin;
    const sessionUrl = `${baseUrl}/?code=${sessionCode}`;
    sessionUrlInput.value = sessionUrl;

    renderQrCode(sessionUrl);

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
            setStatusBadge('Session live', 'success');
            connectionStatus.textContent = 'Waiting for students to join...';
            copyBtn.disabled = false;

            const { error } = await channel.track({ role: 'teacher', sessionCode });
            if (error) {
                console.error('Failed to track teacher presence', error);
            }

            safeSend('teacher_ready', { sessionCode });
            startSyncLoop();
        } else if (status === 'CHANNEL_ERROR') {
            setStatusBadge('Realtime connection error', 'error');
        } else if (status === 'TIMED_OUT') {
            setStatusBadge('Supabase connection timed out', 'error');
        } else if (status === 'CLOSED') {
            setStatusBadge('Realtime channel closed', 'error');
            stopSyncLoop();
        }
    });

    setupCopyButton();
    window.addEventListener('beforeunload', handleWindowUnload);
}

function wireChannelEvents() {
    channel.on('presence', { event: 'sync' }, handlePresenceSync);

    channel.on('broadcast', { event: 'student_ready' }, ({ payload }) => {
        if (payload?.username) {
            const isNew = !students.has(payload.username);
            ensureStudentCard(payload.username);
            updateConnectionStatus();
            if (isNew) {
                requestStudentData(payload.username);
            }
        }
    });

    channel.on('broadcast', { event: 'draw_batch' }, ({ payload }) => {
        const { username, batch } = payload || {};
        if (!username || !Array.isArray(batch)) return;
        ensureStudentCard(username);

        const student = students.get(username);
        const { ctx } = student;
        batch.forEach((data) => {
            if (data.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(data.startX, data.startY);
                ctx.lineTo(data.endX, data.endY);
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            } else if (data.type === 'dot') {
                ctx.beginPath();
                ctx.arc(data.x, data.y, data.radius, 0, Math.PI * 2);
                ctx.fillStyle = data.color;
                ctx.fill();
            }
        });

        updateStudentActivity(username);
    });

    const canvasEvents = ['student_canvas', 'clear', 'erase', 'undo', 'redo'];
    canvasEvents.forEach((eventName) => {
        channel.on('broadcast', { event: eventName }, ({ payload }) => {
            const { username, canvasState } = payload || {};
            if (!username || !canvasState) return;
            ensureStudentCard(username);
            updateStudentCanvas(username, canvasState);
            updateStudentActivity(username);
        });
    });
}

function handlePresenceSync() {
    if (!channel) return;

    const presenceState = channel.presenceState();
    const activeStudents = new Set();

    Object.values(presenceState).forEach((entries) => {
        entries.forEach((entry) => {
            if (entry.role === 'student' && entry.username) {
                activeStudents.add(entry.username);
                const isNew = !students.has(entry.username);
                ensureStudentCard(entry.username);
                if (isNew) {
                    requestStudentData(entry.username);
                }
            }
        });
    });

    students.forEach((value, username) => {
        if (!activeStudents.has(username)) {
            value.container.remove();
            students.delete(username);
        }
    });

    updateConnectionStatus();
}

function ensureStudentCard(username) {
    if (students.has(username)) {
        return students.get(username);
    }

    const container = document.createElement('article');
    container.className = 'student-card';
    container.setAttribute('data-username', username);

    const header = document.createElement('header');
    header.className = 'student-card__header';

    const nameEl = document.createElement('h3');
    nameEl.textContent = username;

    const statusDot = document.createElement('span');
    statusDot.className = 'student-card__status-dot';

    const updatedAt = document.createElement('p');
    updatedAt.className = 'student-card__meta';
    updatedAt.textContent = 'Awaiting activity';

    header.appendChild(nameEl);
    header.appendChild(statusDot);

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'student-card__canvas';

    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 320;
    canvasWrapper.appendChild(canvas);

    container.appendChild(header);
    container.appendChild(updatedAt);
    container.appendChild(canvasWrapper);
    studentGrid.appendChild(container);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaleRatio = canvas.width / 800;
    ctx.scale(scaleRatio, scaleRatio);

    const student = {
        container,
        canvas,
        ctx,
        statusDot,
        updatedAt,
        lastActivity: Date.now()
    };

    students.set(username, student);
    return student;
}

function updateStudentCanvas(username, canvasState) {
    const student = students.get(username);
    if (!student || !canvasState?.paths) return;

    const { ctx, canvas } = student;
    resetCanvas(ctx, canvas);

    canvasState.paths.forEach((path) => {
        if (!Array.isArray(path.points) || path.points.length === 0) {
            return;
        }

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

    setStudentSyncState(username, true);
}

function resetCanvas(ctx, canvas) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaleRatio = canvas.width / 800;
    ctx.scale(scaleRatio, scaleRatio);
}

function updateStudentActivity(username) {
    const student = students.get(username);
    if (!student) return;

    student.lastActivity = Date.now();
    student.updatedAt.textContent = `Last update ${new Date().toLocaleTimeString()}`;
    setStudentSyncState(username, true);
}

function setStudentSyncState(username, isSynced) {
    const student = students.get(username);
    if (!student) return;
    student.statusDot.classList.toggle('student-card__status-dot--error', !isSynced);
}

function updateConnectionStatus() {
    if (students.size === 0) {
        connectionStatus.textContent = 'Waiting for students to join...';
        return;
    }

    connectionStatus.textContent = `${students.size} student${students.size === 1 ? '' : 's'} connected`;
}

function startSyncLoop() {
    stopSyncLoop();
    syncInterval = setInterval(() => {
        if (!channelReady || students.size === 0) {
            return;
        }

        students.forEach((_, username) => {
            setStudentSyncState(username, false);
            requestStudentData(username);
        });
    }, 4000);
}

function stopSyncLoop() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

function requestStudentData(username) {
    safeSend('request_canvas', {
        target: username,
        requestedBy: 'teacher'
    });
}

function safeSend(event, payload = {}) {
    if (!channelReady || !channel) return;
    channel.send({ type: 'broadcast', event, payload }).then(({ error }) => {
        if (error) {
            console.error(`Supabase event "${event}" failed`, error);
        }
    }).catch((err) => {
        console.error(`Supabase event "${event}" threw`, err);
    });
}

function setupCopyButton() {
    copyBtn.addEventListener('click', () => {
        const text = sessionUrlInput.value;
        if (!text) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showCopyFeedback('Copied!');
            }).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    });
}

function fallbackCopy(text) {
    sessionUrlInput.select();
    document.execCommand('copy');
    showCopyFeedback('Copied!');
}

function showCopyFeedback(message) {
    copyBtn.textContent = message;
    copyBtn.disabled = true;
    setTimeout(() => {
        copyBtn.textContent = 'Copy link';
        copyBtn.disabled = false;
    }, 1600);
}

function handleWindowUnload() {
    safeSend('session_closed', { reason: 'teacher_left' });
    stopSyncLoop();
    channel?.unsubscribe();
}

function renderQrCode(url) {
    const container = document.getElementById('qrcode');
    if (!container) return;
    container.innerHTML = '';

    if (typeof QRCode === 'undefined') {
        const fallback = document.createElement('p');
        fallback.textContent = url;
        container.appendChild(fallback);
        return;
    }

    new QRCode(container, {
        text: url,
        width: 220,
        height: 220,
        colorDark: '#1f2933',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function generateSessionCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function showConfigurationError() {
    setStatusBadge('Supabase keys required', 'error');
    connectionStatus.textContent = 'Add SUPABASE_URL and SUPABASE_ANON_KEY to run realtime sessions.';
    copyBtn.disabled = true;
}

function setStatusBadge(text, variant) {
    statusBadge.textContent = text;
    statusBadge.classList.remove('status-badge--error', 'status-badge--pending', 'status-badge--success');

    if (variant === 'error') {
        statusBadge.classList.add('status-badge--error');
    } else if (variant === 'success') {
        statusBadge.classList.add('status-badge--success');
    } else if (variant === 'pending') {
        statusBadge.classList.add('status-badge--pending');
    }
}
