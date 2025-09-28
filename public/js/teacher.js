import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';

const statusBadge = document.getElementById('sessionStatusBadge');
const connectionStatus = document.getElementById('connection-status');
const studentGrid = document.getElementById('studentGrid');
const gridColumnsSelect = document.getElementById('gridColumnsSelect');
const sessionCodeEl = document.getElementById('sessionCode');
const sessionUrlInput = document.getElementById('sessionUrl');
const copyBtn = document.getElementById('copyBtn');
const referenceInput = document.getElementById('referenceImage');
const clearImageBtn = document.getElementById('clearImageBtn');
const pushImageBtn = document.getElementById('pushImageBtn');
const referencePreview = document.getElementById('referencePreview');
const referencePreviewImage = document.getElementById('referencePreviewImage');
const referenceStatus = document.getElementById('referenceStatus');
const referenceFileName = document.getElementById('referenceFileName');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const studentModal = document.getElementById('studentModal');
const studentModalCanvas = document.getElementById('studentModalCanvas');
const studentModalTitle = document.getElementById('studentModalTitle');
const studentModalSubtitle = document.getElementById('studentModalSubtitle');
const studentModalClose = document.getElementById('studentModalClose');
const openModesBtn = document.getElementById('openModesBtn');
const modeModal = document.getElementById('modeModal');
const modeModalClose = document.getElementById('modeModalClose');
const PRESET_BACKGROUNDS = Object.freeze({
    chinese: {
        id: 'chinese',
        label: 'Chinese words',
        description: 'Green four-square grid with dotted guidelines.',
        imageData: createSvgDataUrl(`
            <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
                <rect x="48" y="48" width="928" height="928" rx="64" ry="64" fill="none" stroke="#8fbf68" stroke-width="32"/>
                <rect x="80" y="80" width="864" height="864" rx="48" ry="48" fill="none" stroke="#cfe5b6" stroke-width="12"/>
                <line x1="80" y1="512" x2="944" y2="512" stroke="#8fbf68" stroke-width="18" stroke-linecap="round" stroke-dasharray="2 26" stroke-opacity="0.9"/>
                <line x1="512" y1="80" x2="512" y2="944" stroke="#8fbf68" stroke-width="18" stroke-linecap="round" stroke-dasharray="2 26" stroke-opacity="0.9"/>
            </svg>
        `),
        previewAlt: 'Chinese words practice grid preview',
        vector: createChineseVectorData()
    },
    graphCross: {
        id: 'graphCross',
        label: 'Cross grid',
        description: 'Centered axes with arrows pointing up and right.',
        imageData: createSvgDataUrl(`
            <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
                <defs>
                    <marker id="arrow-head" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,1 L12,7 L0,13 Z" fill="#4b5563"/>
                    </marker>
                </defs>
                <rect x="64" y="64" width="896" height="896" fill="#ffffff" stroke="#d1d5db" stroke-width="6"/>
                <g stroke="#e2e8f0" stroke-width="2">
                    <path d="M64 192 H960"/>
                    <path d="M64 320 H960"/>
                    <path d="M64 448 H960"/>
                    <path d="M64 576 H960"/>
                    <path d="M64 704 H960"/>
                    <path d="M64 832 H960"/>
                    <path d="M192 64 V960"/>
                    <path d="M320 64 V960"/>
                    <path d="M448 64 V960"/>
                    <path d="M576 64 V960"/>
                    <path d="M704 64 V960"/>
                    <path d="M832 64 V960"/>
                </g>
                <line x1="80" y1="512" x2="944" y2="512" stroke="#4b5563" stroke-width="8" marker-end="url(#arrow-head)"/>
                <line x1="512" y1="944" x2="512" y2="80" stroke="#4b5563" stroke-width="8" marker-end="url(#arrow-head)"/>
            </svg>
        `),
        previewAlt: 'Graph grid with centered axes preview',
        vector: createGraphCrossVectorData()
    },
    graphCorner: {
        id: 'graphCorner',
        label: 'Corner grid',
        description: 'Axes start in the bottom-left corner with arrows on the positives.',
        imageData: createSvgDataUrl(`
            <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
                <defs>
                    <marker id="arrow-head-corner" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,1 L12,7 L0,13 Z" fill="#334155"/>
                    </marker>
                </defs>
                <rect x="64" y="64" width="896" height="896" fill="#ffffff" stroke="#d1d5db" stroke-width="6"/>
                <g stroke="#e2e8f0" stroke-width="2">
                    <path d="M64 832 H960"/>
                    <path d="M64 704 H960"/>
                    <path d="M64 576 H960"/>
                    <path d="M64 448 H960"/>
                    <path d="M64 320 H960"/>
                    <path d="M64 192 H960"/>
                    <path d="M192 64 V960"/>
                    <path d="M320 64 V960"/>
                    <path d="M448 64 V960"/>
                    <path d="M576 64 V960"/>
                    <path d="M704 64 V960"/>
                    <path d="M832 64 V960"/>
                </g>
                <line x1="96" y1="896" x2="96" y2="112" stroke="#334155" stroke-width="10" marker-end="url(#arrow-head-corner)"/>
                <line x1="96" y1="896" x2="912" y2="896" stroke="#334155" stroke-width="10" marker-end="url(#arrow-head-corner)"/>
            </svg>
        `),
        previewAlt: 'Corner graph grid preview',
        vector: createGraphCornerVectorData()
    }
});
const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 600;

let supabase;
let channel;
let channelReady = false;
let sessionCode = '';
let syncInterval = null;
let selectedImageData = null;
let selectedImageName = '';
let activeBackgroundImage = null;
let activeBackgroundVectors = null;
let preferredGridColumns = 3;
let activeModalStudent = null;
let modalReturnFocus = null;
let activePresetId = null;
let modeOptionButtons = [];
let modePreviewImages = [];
let isModeModalOpen = false;
let modeModalReturnFocus = null;
let studentModalResizeObserver = null;
const presenceKey = `teacher-${Math.random().toString(36).slice(2, 10)}`;
const students = new Map();
const GRID_STORAGE_KEY = 'teacher-grid-columns';

const RELIABLE_EVENT_LIMIT = 64;
let reliableSequence = 0;
const reliableEventLog = [];

const CHANNEL_RECONNECT_DELAY = 2000;
let channelReconnectTimer = null;
let isReconnecting = false;

const sessionState = {
    questionNumber: 1,
    lastQuestionStartedAt: Date.now(),
    backgroundVersion: 0,
    backgroundName: null,
    backgroundActive: false,
    lastSequence: 0,
    lastBackgroundUpdateAt: Date.now()
};

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

async function initialiseTeacherConsole() {
    setStatusBadge('Connecting to Supabase...', 'pending');
    if (copyBtn) {
        copyBtn.disabled = true;
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
    });

    sessionCode = generateSessionCode();
    sessionCodeEl.textContent = sessionCode;

    const baseUrl = window.location.origin;
    const sessionUrl = `${baseUrl}/?code=${sessionCode}`;
    sessionUrlInput.value = sessionUrl;

    renderQrCode(sessionUrl);

    initialiseRealtimeChannel();

    setupCopyButton();
    setupClassroomControls();
    setupStudentGridControls();
    setupStudentModal();
    setupModeModal();
    window.addEventListener('beforeunload', handleWindowUnload);
}

function clonePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }

    if (typeof structuredClone === 'function') {
        return structuredClone(payload);
    }

    try {
        return JSON.parse(JSON.stringify(payload));
    } catch (_error) {
        return payload;
    }
}

function initialiseRealtimeChannel() {
    if (!supabase) {
        return;
    }

    if (channelReconnectTimer !== null) {
        clearTimeout(channelReconnectTimer);
        channelReconnectTimer = null;
    }

    channelReady = false;
    channel = createRealtimeChannel();
    wireChannelEvents();
    subscribeToRealtimeChannel();
}

function createRealtimeChannel() {
    return supabase.channel(`session-${sessionCode}`, {
        config: {
            broadcast: { self: false },
            presence: { key: presenceKey }
        }
    });
}

function subscribeToRealtimeChannel() {
    if (!channel) {
        return;
    }

    try {
        const subscription = channel.subscribe(onChannelStatusChange);
        if (subscription && typeof subscription.then === 'function') {
            subscription.catch((error) => {
                console.error('Realtime subscription failed', error);
                handleChannelDisconnection('Realtime connection error', 'subscribe_failed');
            });
        }
    } catch (error) {
        console.error('Realtime subscription threw an error', error);
        handleChannelDisconnection('Realtime connection error', 'subscribe_exception');
    }
}

async function onChannelStatusChange(status) {
    if (status === 'SUBSCRIBED') {
        if (channelReconnectTimer !== null) {
            clearTimeout(channelReconnectTimer);
            channelReconnectTimer = null;
        }

        isReconnecting = false;
        channelReady = true;
        setStatusBadge('Session live', 'success');
        if (connectionStatus) {
            connectionStatus.textContent = 'Waiting for students to join...';
        }
        if (copyBtn) {
            copyBtn.disabled = false;
        }

        try {
            const { error } = await channel.track({ role: 'teacher', sessionCode });
            if (error) {
                console.error('Failed to track teacher presence', error);
            }
        } catch (error) {
            console.error('Failed to track teacher presence', error);
        }

        safeSend('teacher_ready', { sessionCode });
        sendSessionSnapshot();
        startSyncLoop();
        return;
    }

    if (status === 'CHANNEL_ERROR') {
        handleChannelDisconnection('Realtime connection error', 'channel_error');
        return;
    }

    if (status === 'TIMED_OUT') {
        handleChannelDisconnection('Supabase connection timed out', 'timed_out');
        return;
    }

    if (status === 'CLOSED') {
        handleChannelDisconnection('Realtime channel closed', 'closed');
    }
}

function handleChannelDisconnection(message, reason) {
    if (reason === 'closed' && isReconnecting) {
        return;
    }

    isReconnecting = true;
    channelReady = false;
    stopSyncLoop();
    if (copyBtn) {
        copyBtn.disabled = true;
    }
    setStatusBadge(message, 'error');
    if (connectionStatus) {
        connectionStatus.textContent = 'Reconnecting to Supabase...';
    }
    scheduleChannelReconnect(reason);
}

function scheduleChannelReconnect(reason) {
    if (channelReconnectTimer !== null || !supabase) {
        return;
    }

    console.warn('Realtime channel interrupted, attempting to reconnect', reason);
    channelReconnectTimer = setTimeout(() => {
        channelReconnectTimer = null;
        attemptChannelReconnect();
    }, CHANNEL_RECONNECT_DELAY);
}

function attemptChannelReconnect() {
    if (!supabase) {
        return;
    }

    if (channel && typeof channel.unsubscribe === 'function') {
        try {
            const result = channel.unsubscribe();
            if (result && typeof result.then === 'function') {
                result.catch((error) => {
                    console.warn('Failed to unsubscribe from realtime channel cleanly', error);
                });
            }
        } catch (error) {
            console.warn('Failed to unsubscribe from realtime channel', error);
        }
    }

    channelReady = false;
    channel = createRealtimeChannel();
    wireChannelEvents();
    subscribeToRealtimeChannel();
}

function sendReliableBroadcast(event, payload = {}, options = {}) {
    if (!channelReady || !channel) {
        return null;
    }

    const shouldLog = options.log !== false;
    let sequenceId = null;

    if (shouldLog) {
        reliableSequence += 1;
        sequenceId = reliableSequence;
        reliableEventLog.push({
            id: sequenceId,
            event,
            payload: clonePayload(payload),
            timestamp: Date.now()
        });

        if (reliableEventLog.length > RELIABLE_EVENT_LIMIT) {
            reliableEventLog.shift();
        }

        sessionState.lastSequence = sequenceId;
    }

    const payloadWithSequence = shouldLog
        ? { ...payload, __seq: sequenceId }
        : payload;

    channel.send({ type: 'broadcast', event, payload: payloadWithSequence }).then(({ error }) => {
        if (error) {
            console.error(`Supabase event "${event}" failed`, error);
        }
    }).catch((err) => {
        console.error(`Supabase event "${event}" threw`, err);
    });

    return sequenceId;
}

function recordBackgroundChange(imageData, meta = {}) {
    sessionState.backgroundActive = Boolean(imageData) || Boolean(activeBackgroundVectors);
    sessionState.backgroundVersion += 1;
    sessionState.backgroundName = imageData
        ? (meta.name || meta.label || null)
        : null;
    sessionState.lastBackgroundUpdateAt = Date.now();
}

function advanceQuestionState() {
    sessionState.questionNumber += 1;
    sessionState.lastQuestionStartedAt = Date.now();
    sessionState.backgroundActive = Boolean(activeBackgroundImage);
    if (!sessionState.backgroundActive) {
        sessionState.backgroundName = null;
    }
}

function sendSessionSnapshot(targetUsername, afterSequence = 0) {
    if (!channelReady || !channel) {
        return;
    }

    const events = reliableEventLog
        .filter((entry) => typeof entry.id === 'number' && entry.id > afterSequence)
        .map((entry) => ({
            id: entry.id,
            event: entry.event,
            payload: clonePayload(entry.payload),
            timestamp: entry.timestamp
        }));

    const snapshot = {
        questionNumber: sessionState.questionNumber,
        lastQuestionStartedAt: sessionState.lastQuestionStartedAt,
        backgroundVersion: sessionState.backgroundVersion,
        backgroundName: sessionState.backgroundName,
        backgroundActive: sessionState.backgroundActive,
        lastSequence: sessionState.lastSequence,
        lastBackgroundUpdateAt: sessionState.lastBackgroundUpdateAt
    };

    const payload = {
        snapshot,
        events
    };

    if (targetUsername) {
        payload.target = targetUsername;
    }

    safeSend('session_state', payload);
}

function wireChannelEvents() {
    if (!channel) {
        return;
    }

    channel.on('presence', { event: 'sync' }, handlePresenceSync);

    channel.on('broadcast', { event: 'student_ready' }, ({ payload }) => {
        if (payload?.username) {
            const isNew = !students.has(payload.username);
            ensureStudentCard(payload.username);
            updateConnectionStatus();
            if (isNew) {
                requestStudentData(payload.username);
                sendBackgroundToStudent(payload.username);
            }
            sendSessionSnapshot(payload.username);
        }
    });

    channel.on('broadcast', { event: 'session_state_request' }, ({ payload }) => {
        const { username, lastSequence } = payload || {};
        if (!username) {
            return;
        }

        const afterSequence = typeof lastSequence === 'number' && Number.isFinite(lastSequence)
            ? lastSequence
            : 0;

        sendBackgroundToStudent(username);
        sendSessionSnapshot(username, afterSequence);
    });

    channel.on('broadcast', { event: 'draw_batch' }, ({ payload }) => {
        const { username, batch } = payload || {};
        if (!username || !Array.isArray(batch)) return;
        const student = ensureStudentCard(username);
        if (!student) return;
        applyDrawBatch(student, batch);
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
                    sendSessionSnapshot(entry.username);
                }
            }
        });
    });

    students.forEach((value, username) => {
        if (!activeStudents.has(username)) {
            if (activeModalStudent === username) {
                closeStudentModal();
            }
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

    const identity = document.createElement('div');
    identity.className = 'student-card__identity';
    identity.appendChild(nameEl);
    identity.appendChild(statusDot);

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'student-card__expand';
    expandBtn.textContent = 'Expand';
    expandBtn.addEventListener('click', () => openStudentModal(username, expandBtn));

    const updatedAt = document.createElement('p');
    updatedAt.className = 'student-card__meta';
    updatedAt.textContent = 'Awaiting activity';

    header.appendChild(identity);
    header.appendChild(expandBtn);

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'student-card__canvas';

    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 390;
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
        lastActivity: Date.now(),
        backgroundImageData: null,
        backgroundImageElement: null,
        backgroundVectors: null,
        paths: [],
        previewCanvas: null,
        previewCtx: null
    };

    students.set(username, student);
    return student;
}

function updateStudentCanvas(username, canvasState) {
    const student = students.get(username);
    if (!student || !canvasState) return;

    student.paths = Array.isArray(canvasState.paths) ? canvasState.paths : [];
    student.backgroundVectors = normaliseBackgroundVectorDefinition(canvasState.backgroundVectors);

    const markSynced = () => {
        setStudentSyncState(username, true);
        if (activeModalStudent === username) {
            updateStudentModalMeta(student);
        }
    };

    const backgroundData = typeof canvasState.backgroundImage === 'string' && canvasState.backgroundImage.length > 0
        ? canvasState.backgroundImage
        : null;

    if (backgroundData !== student.backgroundImageData) {
        student.backgroundImageData = backgroundData;

        if (!backgroundData) {
            student.backgroundImageElement = null;
            drawStudentCanvas(student);
            markSynced();
            return;
        }

        loadImage(backgroundData).then((image) => {
            if (student.backgroundImageData !== backgroundData) {
                return;
            }

            student.backgroundImageElement = image;
            drawStudentCanvas(student);
            markSynced();
        }).catch(() => {
            if (student.backgroundImageData === backgroundData) {
                student.backgroundImageElement = null;
                drawStudentCanvas(student);
                markSynced();
            }
        });
        markSynced();
        return;
    }

    drawStudentCanvas(student);
    markSynced();
}

function resetCanvas(ctx, canvas) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaleRatio = canvas.width / BASE_CANVAS_WIDTH;
    ctx.scale(scaleRatio, scaleRatio);
}

function updateStudentActivity(username) {
    const student = students.get(username);
    if (!student) return;

    student.lastActivity = Date.now();
    student.updatedAt.textContent = `Last update ${new Date().toLocaleTimeString()}`;
    setStudentSyncState(username, true);

    if (activeModalStudent === username) {
        updateStudentModalMeta(student);
    }
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

function setupStudentGridControls() {
    if (!studentGrid) {
        return;
    }

    if (gridColumnsSelect) {
        let storedPreference = null;
        try {
            const stored = window.localStorage?.getItem(GRID_STORAGE_KEY);
            if (stored) {
                const parsed = parseInt(stored, 10);
                if (Number.isFinite(parsed)) {
                    storedPreference = parsed;
                }
            }
        } catch (error) {
            console.warn('Failed to read stored grid preference', error);
        }

        const initial = storedPreference ?? parseInt(gridColumnsSelect.value, 10) ?? preferredGridColumns;
        preferredGridColumns = clampNumber(initial, 1, 6);
        gridColumnsSelect.value = String(preferredGridColumns);

        gridColumnsSelect.addEventListener('change', () => {
            const parsed = parseInt(gridColumnsSelect.value, 10);
            if (!Number.isFinite(parsed)) {
                return;
            }

            preferredGridColumns = clampNumber(parsed, 1, 6);
            try {
                window.localStorage?.setItem(GRID_STORAGE_KEY, String(preferredGridColumns));
            } catch (error) {
                console.warn('Failed to persist grid preference', error);
            }
            refreshGridColumns();
        });
    }

    refreshGridColumns();
    window.addEventListener('resize', refreshGridColumns, { passive: true });
}

function refreshGridColumns() {
    if (!studentGrid) {
        return;
    }

    const appliedColumns = Math.min(preferredGridColumns, getMaxColumnsForViewport());
    studentGrid.style.setProperty('--student-grid-columns', appliedColumns);
    studentGrid.dataset.columns = String(appliedColumns);

    if (gridColumnsSelect) {
        gridColumnsSelect.dataset.applied = String(appliedColumns);
        const limited = appliedColumns !== preferredGridColumns;
        gridColumnsSelect.title = limited
            ? `Showing ${appliedColumns} per row (limited by screen size)`
            : `Showing ${appliedColumns} per row`;
    }
}

function getMaxColumnsForViewport() {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width <= 640) {
        return 1;
    }
    if (width <= 1100) {
        return 2;
    }
    return 6;
}

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function setupStudentModal() {
    if (!studentModal || !studentModalCanvas || !studentModalClose) {
        return;
    }

    studentModal.addEventListener('click', (event) => {
        if (event.target === studentModal) {
            closeStudentModal();
        }
    });

    studentModalClose.addEventListener('click', () => {
        closeStudentModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && activeModalStudent) {
            closeStudentModal();
        }
    });

    if (typeof ResizeObserver === 'function' && !studentModalResizeObserver) {
        const wrapper = studentModalCanvas.parentElement;
        if (wrapper) {
            studentModalResizeObserver = new ResizeObserver(() => {
                resizeStudentModalCanvas();
            });
            studentModalResizeObserver.observe(wrapper);
        }
    }
}

function setupModeModal() {
    if (!modeModal || !openModesBtn) {
        return;
    }

    modeOptionButtons = Array.from(modeModal.querySelectorAll('[data-preset]'));
    modePreviewImages = Array.from(modeModal.querySelectorAll('[data-preset-preview]'));

    populatePresetPreviews();
    updateModeSelections();

    openModesBtn.setAttribute('aria-haspopup', 'dialog');
    openModesBtn.setAttribute('aria-expanded', 'false');

    openModesBtn.addEventListener('click', () => {
        openModeModal(openModesBtn);
    });

    if (modeModalClose) {
        modeModalClose.addEventListener('click', () => {
            closeModeModal();
        });
    }

    modeModal.addEventListener('click', (event) => {
        if (event.target === modeModal) {
            closeModeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isModeModalOpen) {
            closeModeModal();
        }
    });

    modeOptionButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const presetId = button.dataset.preset;
            if (presetId) {
                applyPresetBackground(presetId);
            }
        });
    });
}

function populatePresetPreviews() {
    if (!Array.isArray(modePreviewImages)) {
        modePreviewImages = [];
    }

    modePreviewImages.forEach((image) => {
        if (!image) {
            return;
        }
        const presetId = image.dataset.presetPreview;
        const preset = getPresetById(presetId);
        if (preset?.imageData) {
            image.src = preset.imageData;
        }
    });
}

function openModeModal(triggerElement) {
    if (!modeModal) {
        return;
    }

    modeModalReturnFocus = triggerElement || null;
    isModeModalOpen = true;
    addBodyModalLock();
    modeModal.removeAttribute('hidden');
    modeModal.classList.add('app-modal--open');
    modeModal.setAttribute('aria-hidden', 'false');
    if (openModesBtn) {
        openModesBtn.setAttribute('aria-expanded', 'true');
    }

    updateModeSelections();

    const activeButton = Array.isArray(modeOptionButtons)
        ? modeOptionButtons.find((button) => button?.dataset?.preset === activePresetId)
        : null;
    const focusTarget = activeButton || (modeOptionButtons?.[0]) || modeModalClose;
    if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
    }
}

function closeModeModal() {
    if (!modeModal) {
        return;
    }

    modeModal.classList.remove('app-modal--open');
    modeModal.setAttribute('hidden', '');
    modeModal.setAttribute('aria-hidden', 'true');
    isModeModalOpen = false;
    removeBodyModalLock();
    if (openModesBtn) {
        openModesBtn.setAttribute('aria-expanded', 'false');
    }

    if (modeModalReturnFocus && typeof modeModalReturnFocus.focus === 'function' && document.contains(modeModalReturnFocus)) {
        modeModalReturnFocus.focus();
    }
    modeModalReturnFocus = null;
}

function applyPresetBackground(presetId) {
    const preset = getPresetById(presetId);
    if (!preset) {
        return;
    }

    activePresetId = presetId;
    selectedImageData = null;
    selectedImageName = '';

    if (referenceInput) {
        referenceInput.value = '';
    }

    updateModeSelections();

    updateReferencePreview(preset.imageData, preset.previewAlt || 'Selected mode preview');

    if (referenceFileName) {
        referenceFileName.textContent = `Mode: ${preset.label}`;
    }

    if (pushImageBtn) {
        pushImageBtn.disabled = true;
        pushImageBtn.textContent = 'Push to students';
    }

    if (clearImageBtn) {
        clearImageBtn.hidden = false;
    }

    activeBackgroundImage = preset.imageData;
    activeBackgroundVectors = cloneBackgroundVectorDefinition(preset.vector);
    recordBackgroundChange(preset.imageData, { name: preset.label, label: preset.label });
    sendReliableBroadcast('set_background', {
        imageData: preset.imageData,
        presetId: preset.id || null,
        vector: cloneBackgroundVectorDefinition(activeBackgroundVectors)
    });
    updateReferenceStatus(`${preset.label} mode sent to your students.`);
    closeModeModal();
}

function updateModeSelections() {
    if (!Array.isArray(modeOptionButtons)) {
        modeOptionButtons = [];
    }

    modeOptionButtons.forEach((button) => {
        if (!button) {
            return;
        }
        const isActive = button.dataset.preset === activePresetId;
        button.classList.toggle('mode-option--active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function openStudentModal(username, triggerElement) {
    if (!studentModal || !studentModalCanvas) {
        return;
    }

    const student = students.get(username);
    if (!student) {
        return;
    }

    if (activeModalStudent && activeModalStudent !== username) {
        const previous = students.get(activeModalStudent);
        if (previous) {
            previous.previewCanvas = null;
            previous.previewCtx = null;
        }
    }

    activeModalStudent = username;
    modalReturnFocus = triggerElement || null;

    studentModalCanvas.width = 1024;
    studentModalCanvas.height = 768;
    student.previewCanvas = studentModalCanvas;
    student.previewCtx = studentModalCanvas.getContext('2d');

    addBodyModalLock();
    studentModal.removeAttribute('hidden');
    studentModal.classList.add('student-modal--open');
    studentModal.setAttribute('aria-hidden', 'false');

    if (studentModalTitle) {
        studentModalTitle.textContent = username;
    }

    updateStudentModalMeta(student);
    drawStudentCanvas(student);

    resizeStudentModalCanvas();
    window.addEventListener('resize', resizeStudentModalCanvas);
    requestAnimationFrame(resizeStudentModalCanvas);

    if (studentModalClose) {
        studentModalClose.focus();
    }
}

function closeStudentModal() {
    if (!studentModal) {
        return;
    }

    if (activeModalStudent) {
        const student = students.get(activeModalStudent);
        if (student) {
            student.previewCanvas = null;
            student.previewCtx = null;
        }
    }

    activeModalStudent = null;

    studentModal.classList.remove('student-modal--open');
    studentModal.setAttribute('hidden', '');
    studentModal.setAttribute('aria-hidden', 'true');
    removeBodyModalLock();
    window.removeEventListener('resize', resizeStudentModalCanvas);

    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function' && document.contains(modalReturnFocus)) {
        modalReturnFocus.focus();
    }
    modalReturnFocus = null;
}

function resizeStudentModalCanvas() {
    if (!studentModalCanvas) {
        return;
    }

    const container = studentModalCanvas.parentElement;
    if (!container) {
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) {
        return;
    }

    const styles = window.getComputedStyle(container);
    const paddingX = parseFloat(styles.paddingLeft || '0') + parseFloat(styles.paddingRight || '0');
    const paddingY = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');

    const availableWidth = Math.max(0, width - paddingX);
    const availableHeight = Math.max(0, height - paddingY);
    if (!availableWidth || !availableHeight) {
        return;
    }

    const { drawWidth, drawHeight } = calculateContainDimensions(
        BASE_CANVAS_WIDTH,
        BASE_CANVAS_HEIGHT,
        availableWidth,
        availableHeight
    );

    studentModalCanvas.style.width = `${drawWidth}px`;
    studentModalCanvas.style.height = `${drawHeight}px`;
}

function updateStudentModalMeta(student) {
    if (!studentModalSubtitle) {
        return;
    }

    if (!student) {
        studentModalSubtitle.textContent = '';
        return;
    }

    studentModalSubtitle.textContent = student.updatedAt?.textContent || '';
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

function setupClassroomControls() {
    if (!referenceInput || !pushImageBtn || !referenceStatus) {
        return;
    }

    referenceInput.addEventListener('change', handleReferenceSelection);

    if (pushImageBtn) {
        pushImageBtn.addEventListener('click', handlePushImageToStudents);
    }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', () => {
            clearReferenceImage(true);
        });
    }

    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', handleNextQuestion);
    }

    updateReferenceStatus('Choose an image to send to your class.');
}

function handleReferenceSelection(event) {
    const files = event?.target?.files;
    if (!files || files.length === 0) {
        return;
    }

    const [file] = files;
    if (!file || !file.type.startsWith('image/')) {
        updateReferenceStatus('Please choose a supported image file.');
        if (referenceInput) {
            referenceInput.value = '';
        }
        return;
    }

    selectedImageName = file.name || '';

    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result !== 'string') {
            updateReferenceStatus('We could not read that file. Please try another image.');
            return;
        }

        selectedImageData = reader.result;
        activePresetId = null;
        updateModeSelections();
        updateReferencePreview(
            selectedImageData,
            selectedImageName
                ? `Preview of ${selectedImageName}`
                : 'Selected reference preview'
        );

        if (referenceFileName) {
            referenceFileName.textContent = selectedImageName
                ? `Selected: ${selectedImageName}`
                : 'Image ready to send';
        }

        if (pushImageBtn) {
            pushImageBtn.disabled = false;
        }

        if (clearImageBtn) {
            clearImageBtn.hidden = false;
        }

        updateReferenceStatus(`Ready to send "${selectedImageName}" to your students.`);
    };
    reader.onerror = () => {
        updateReferenceStatus('We could not read that file. Please try another image.');
    };
    reader.readAsDataURL(file);
}

function handlePushImageToStudents() {
    if (!selectedImageData) {
        updateReferenceStatus('Choose an image before pushing it to students.');
        return;
    }

    if (!channelReady) {
        updateReferenceStatus('Realtime connection not ready yet. Please try again momentarily.');
        return;
    }

    activeBackgroundImage = selectedImageData;
    activeBackgroundVectors = null;
    recordBackgroundChange(selectedImageData, { name: selectedImageName || 'Uploaded image' });
    sendReliableBroadcast('set_background', {
        imageData: selectedImageData,
        fileName: selectedImageName || null,
        vector: null
    });
    updateReferenceStatus('Image sent to your students.');
    showPushFeedback('Sent!');
}

function clearReferenceImage(resetActive = false) {
    selectedImageData = null;
    selectedImageName = '';

    if (resetActive) {
        activeBackgroundImage = null;
        activeBackgroundVectors = null;
        recordBackgroundChange(null, { name: null });
    }

    activePresetId = null;
    updateModeSelections();

    if (referenceInput) {
        referenceInput.value = '';
    }

    updateReferencePreview(null);

    if (referenceFileName) {
        referenceFileName.textContent = 'No image selected';
    }

    if (pushImageBtn) {
        pushImageBtn.disabled = true;
        pushImageBtn.textContent = 'Push to students';
    }

    if (clearImageBtn) {
        clearImageBtn.hidden = true;
    }

    updateReferenceStatus('Choose an image to send to your class.');
}

function updateReferencePreview(imageData, altText = 'Selected reference preview') {
    if (!referencePreview || !referencePreviewImage) {
        return;
    }

    if (!imageData) {
        referencePreviewImage.removeAttribute('src');
        referencePreviewImage.alt = '';
        referencePreview.hidden = true;
        return;
    }

    referencePreview.hidden = false;
    referencePreviewImage.src = imageData;
    referencePreviewImage.alt = altText;
}

function updateReferenceStatus(message) {
    if (!referenceStatus) return;
    referenceStatus.textContent = message;
}

function showPushFeedback(message) {
    if (!pushImageBtn) return;
    const originalText = pushImageBtn.textContent;
    pushImageBtn.textContent = message;
    pushImageBtn.disabled = true;
    setTimeout(() => {
        pushImageBtn.textContent = originalText;
        if (selectedImageData) {
            pushImageBtn.disabled = false;
        }
    }, 1600);
}

function sendBackgroundToStudent(username) {
    if (!username || (!activeBackgroundImage && !activeBackgroundVectors)) {
        return;
    }

    safeSend('set_background', {
        imageData: activeBackgroundImage || null,
        target: username,
        vector: cloneBackgroundVectorDefinition(activeBackgroundVectors)
    });
}

function handleNextQuestion() {
    if (typeof window !== 'undefined') {
        const confirmReset = window.confirm('Clear every student canvas and move to the next question?');
        if (!confirmReset) {
            return;
        }
    }

    clearReferenceImage(true);
    advanceQuestionState();
    const { questionNumber } = sessionState;
    sendReliableBroadcast('next_question', {
        initiatedAt: Date.now(),
        questionNumber
    });
    clearAllStudentCanvases();
    updateReferenceStatus('Student canvases cleared. Share a new image when you\'re ready.');
}

function clearAllStudentCanvases() {
    students.forEach((student, username) => {
        student.backgroundImageData = null;
        student.backgroundImageElement = null;
        student.backgroundVectors = null;
        student.paths = [];
        drawStudentCanvas(student);
        student.updatedAt.textContent = 'Awaiting activity';
        setStudentSyncState(username, true);
        if (activeModalStudent === username) {
            updateStudentModalMeta(student);
        }
    });
}

function applyDrawBatch(student, batch) {
    if (!student || !Array.isArray(batch) || batch.length === 0) {
        return;
    }

    const targets = getStudentTargets(student);
    if (targets.length === 0) {
        return;
    }

    targets.forEach(({ ctx }) => {
        drawBatchToContext(ctx, batch);
    });
}

function drawBatchToContext(ctx, batch) {
    if (!ctx) {
        return;
    }

    batch.forEach((data) => {
        if (!data) {
            return;
        }

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
        } else if (data.type === 'quadratic') {
            ctx.beginPath();
            ctx.moveTo(data.startX, data.startY);
            ctx.quadraticCurveTo(data.controlX, data.controlY, data.endX, data.endY);
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    });
}

function drawStudentCanvas(student) {
    const targets = getStudentTargets(student);
    if (targets.length === 0) {
        return;
    }

    const render = () => {
        targets.forEach(({ ctx, canvas }) => {
            resetCanvas(ctx, canvas);
            drawStudentBackground(ctx, student.backgroundImageElement, student.backgroundVectors);
            renderStudentPaths(ctx, student.paths);
        });
    };

    render();

    if (student.backgroundImageElement && !student.backgroundImageElement.complete) {
        student.backgroundImageElement.onload = () => {
            student.backgroundImageElement.onload = null;
            student.backgroundImageElement.onerror = null;
            render();
        };
        student.backgroundImageElement.onerror = () => {
            student.backgroundImageElement.onload = null;
            student.backgroundImageElement.onerror = null;
            student.backgroundImageElement = null;
            render();
        };
    }
}

function getStudentTargets(student) {
    if (!student) {
        return [];
    }

    const targets = [];

    if (student.ctx && student.canvas) {
        targets.push({ ctx: student.ctx, canvas: student.canvas });
    }

    if (student.previewCtx && student.previewCanvas) {
        targets.push({ ctx: student.previewCtx, canvas: student.previewCanvas });
    }

    return targets;
}

function renderStudentPaths(ctx, paths) {
    paths.forEach((path) => {
        drawSmoothStudentPath(ctx, path);
    });
}

function drawSmoothStudentPath(ctx, path) {
    if (!path || !Array.isArray(path.points) || path.points.length === 0) {
        return;
    }

    const points = normaliseStudentPoints(path.points);
    if (points.length === 0) {
        return;
    }

    const baseWidth = typeof path.width === 'number' && path.width > 0 ? path.width : 2.2;
    const erase = Boolean(path.erase);
    const strokeColor = erase ? '#000000' : (typeof path.color === 'string' ? path.color : '#111827');

    ctx.save();
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';

    if (points.length === 1) {
        const [point] = points;
        const radius = Math.max(baseWidth * 0.5, baseWidth * 0.35, 0.5);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.restore();
        return;
    }

    let startPoint = { x: points[0].x, y: points[0].y };
    let previous = points[0];

    for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        const midpoint = getStudentMidpoint(previous, current);
        const width = computeStudentSegmentWidth(baseWidth);

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
        ctx.lineWidth = width;
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        startPoint = midpoint;
        previous = current;
    }

    const lastPoint = points[points.length - 1];
    const finalWidth = computeStudentSegmentWidth(baseWidth);
    const radius = Math.max(baseWidth / 2, finalWidth / 2, baseWidth * 0.35);
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.restore();
}

function normaliseStudentPoints(rawPoints) {
    return rawPoints.reduce((accumulator, point) => {
        if (!point) {
            return accumulator;
        }

        if (Array.isArray(point)) {
            const [x, y] = point;
            if (typeof x === 'number' && typeof y === 'number') {
                accumulator.push({
                    x,
                    y,
                    p: 1
                });
            }
            return accumulator;
        }

        if (typeof point === 'object') {
            const { x, y } = point;
            if (typeof x === 'number' && typeof y === 'number') {
                accumulator.push({
                    x,
                    y,
                    p: 1
                });
            }
        }

        return accumulator;
    }, []);
}

function getStudentMidpoint(a, b) {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
}

function computeStudentSegmentWidth(baseWidth) {
    const base = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : 1.6;
    const minWidth = base * 0.35;
    return Math.max(Math.max(0.75, minWidth), base);
}

function studentClamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function drawStudentBackground(ctx, image, vectorDefinition) {
    if (!ctx) {
        return;
    }

    if (image && image.width && image.height) {
        const { drawWidth, drawHeight, offsetX, offsetY } = calculateContainDimensions(
            image.width,
            image.height,
            BASE_CANVAS_WIDTH,
            BASE_CANVAS_HEIGHT
        );

        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    }

    if (vectorDefinition) {
        drawVectorDefinition(ctx, vectorDefinition, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
    }
}

function drawVectorDefinition(ctx, definition, targetWidth, targetHeight) {
    const normalised = normaliseBackgroundVectorDefinition(definition);
    if (!normalised) {
        return;
    }

    const { width, height, elements } = normalised;
    if (!width || !height || elements.length === 0) {
        return;
    }

    const { drawWidth, drawHeight, offsetX, offsetY } = calculateContainDimensions(
        width,
        height,
        targetWidth,
        targetHeight
    );

    const scaleX = drawWidth / width;
    const scaleY = drawHeight / height;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleX, scaleY);

    elements.forEach((element) => {
        ctx.save();

        const opacity = typeof element.opacity === 'number'
            ? clampNumber(element.opacity, 0, 1)
            : 1;
        ctx.globalAlpha = opacity;

        if (Array.isArray(element.dash) && element.dash.length > 0) {
            ctx.setLineDash(element.dash);
        } else {
            ctx.setLineDash([]);
        }

        switch (element.type) {
            case 'line':
                ctx.beginPath();
                ctx.lineCap = element.cap || 'butt';
                ctx.lineJoin = element.join || 'miter';
                ctx.lineWidth = element.strokeWidth || 1;
                ctx.strokeStyle = element.stroke || '#000000';
                ctx.moveTo(element.x1, element.y1);
                ctx.lineTo(element.x2, element.y2);
                ctx.stroke();
                break;
            case 'arrow':
                ctx.beginPath();
                ctx.lineCap = element.cap || 'butt';
                ctx.lineJoin = element.join || 'miter';
                ctx.lineWidth = element.strokeWidth || 1;
                ctx.strokeStyle = element.stroke || '#000000';
                ctx.moveTo(element.x1, element.y1);
                ctx.lineTo(element.x2, element.y2);
                ctx.stroke();
                drawArrowHead(ctx, element);
                break;
            case 'rect':
            case 'roundedRect': {
                drawRoundedRectPath(ctx, element.x, element.y, element.width, element.height, element.radius || 0);
                if (element.fill) {
                    ctx.fillStyle = element.fill;
                    ctx.fill();
                }
                if (element.stroke && element.strokeWidth > 0) {
                    ctx.strokeStyle = element.stroke;
                    ctx.lineWidth = element.strokeWidth;
                    ctx.lineJoin = element.join || 'miter';
                    ctx.stroke();
                }
                break;
            }
            default:
                break;
        }

        ctx.restore();
    });

    ctx.restore();
}

function calculateContainDimensions(sourceWidth, sourceHeight, targetWidth, targetHeight) {
    if (!sourceWidth || !sourceHeight) {
        return { drawWidth: 0, drawHeight: 0, offsetX: 0, offsetY: 0 };
    }

    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = targetWidth / targetHeight;

    let drawWidth = targetWidth;
    let drawHeight = targetHeight;

    if (sourceRatio > targetRatio) {
        drawHeight = targetWidth / sourceRatio;
    } else {
        drawWidth = targetHeight * sourceRatio;
    }

    const offsetX = (targetWidth - drawWidth) / 2;
    const offsetY = (targetHeight - drawHeight) / 2;

    return { drawWidth, drawHeight, offsetX, offsetY };
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
    const resolvedRadius = Math.max(0, Math.min(radius || 0, Math.min(width, height) / 2));

    ctx.beginPath();
    if (resolvedRadius === 0) {
        ctx.rect(x, y, width, height);
        return;
    }

    ctx.moveTo(x + resolvedRadius, y);
    ctx.lineTo(x + width - resolvedRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
    ctx.lineTo(x + width, y + height - resolvedRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
    ctx.lineTo(x + resolvedRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
    ctx.lineTo(x, y + resolvedRadius);
    ctx.quadraticCurveTo(x, y, x + resolvedRadius, y);
    ctx.closePath();
}

function drawArrowHead(ctx, element) {
    const headLength = element.headLength || Math.max(12, (element.strokeWidth || 1) * 3);
    const headWidth = element.headWidth || headLength * 0.6;
    const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);

    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    const leftX = element.x2 - headLength * cos + (headWidth / 2) * sin;
    const leftY = element.y2 - headLength * sin - (headWidth / 2) * cos;
    const rightX = element.x2 - headLength * cos - (headWidth / 2) * sin;
    const rightY = element.y2 - headLength * sin + (headWidth / 2) * cos;

    ctx.beginPath();
    ctx.moveTo(element.x2, element.y2);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = element.fill || element.stroke || '#000000';
    ctx.fill();
}

function cloneBackgroundVectorDefinition(definition) {
    const normalised = normaliseBackgroundVectorDefinition(definition);
    if (!normalised) {
        return null;
    }

    return {
        width: normalised.width,
        height: normalised.height,
        elements: normalised.elements.map((element) => ({
            ...element,
            dash: Array.isArray(element.dash) ? [...element.dash] : undefined
        }))
    };
}

function normaliseBackgroundVectorDefinition(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const width = toPositiveNumber(
        raw.width ?? raw.viewBoxWidth ?? (raw.viewBox && raw.viewBox.width)
    );
    const height = toPositiveNumber(
        raw.height ?? raw.viewBoxHeight ?? (raw.viewBox && raw.viewBox.height)
    );

    if (!width || !height) {
        return null;
    }

    const sourceElements = Array.isArray(raw.elements) ? raw.elements : [];
    const elements = sourceElements.reduce((accumulator, element) => {
        const normalisedElement = normaliseVectorElement(element);
        if (normalisedElement) {
            accumulator.push(normalisedElement);
        }
        return accumulator;
    }, []);

    if (elements.length === 0) {
        return null;
    }

    return { width, height, elements };
}

function normaliseVectorElement(element) {
    if (!element || typeof element !== 'object') {
        return null;
    }

    const type = typeof element.type === 'string' ? element.type : '';

    if (type === 'line' || type === 'arrow') {
        const x1 = toFiniteNumber(element.x1);
        const y1 = toFiniteNumber(element.y1);
        const x2 = toFiniteNumber(element.x2);
        const y2 = toFiniteNumber(element.y2);

        if (x1 === null || y1 === null || x2 === null || y2 === null) {
            return null;
        }

        const strokeWidth = toPositiveNumber(element.strokeWidth, 1);
        const dash = normaliseDashArray(element.dash);
        const opacity = normaliseOpacity(element.opacity);
        const stroke = normaliseColor(element.stroke) || '#000000';

        const base = {
            type,
            x1,
            y1,
            x2,
            y2,
            stroke,
            strokeWidth,
            cap: normaliseLineCap(element.cap),
            join: normaliseLineJoin(element.join),
            dash,
            opacity
        };

        if (type === 'arrow') {
            return {
                ...base,
                headLength: toPositiveNumber(element.headLength, Math.max(12, strokeWidth * 3)),
                headWidth: toPositiveNumber(element.headWidth, Math.max(8, strokeWidth * 2)),
                fill: normaliseColor(element.fill) || stroke
            };
        }

        return base;
    }

    if (type === 'rect' || type === 'roundedRect') {
        const x = toFiniteNumber(element.x);
        const y = toFiniteNumber(element.y);
        const width = toPositiveNumber(element.width);
        const height = toPositiveNumber(element.height);

        if (x === null || y === null || !width || !height) {
            return null;
        }

        const strokeWidthValue = toPositiveNumber(element.strokeWidth, null);

        return {
            type,
            x,
            y,
            width,
            height,
            radius: type === 'roundedRect'
                ? toNonNegativeNumber(element.radius, 0)
                : 0,
            stroke: normaliseColor(element.stroke),
            strokeWidth: strokeWidthValue ?? 0,
            fill: normaliseFill(element.fill),
            join: normaliseLineJoin(element.join),
            opacity: normaliseOpacity(element.opacity)
        };
    }

    return null;
}

function normaliseLineCap(value) {
    if (typeof value !== 'string') {
        return 'butt';
    }

    const cap = value.toLowerCase();
    return cap === 'round' || cap === 'square' ? cap : 'butt';
}

function normaliseLineJoin(value) {
    if (typeof value !== 'string') {
        return 'miter';
    }

    const join = value.toLowerCase();
    return join === 'round' || join === 'bevel' ? join : 'miter';
}

function normaliseDashArray(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const dash = value
        .map((entry) => toPositiveNumber(entry, null))
        .filter((entry) => entry !== null);

    return dash.length > 0 ? dash : undefined;
}

function normaliseOpacity(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 1;
    }

    return clampNumber(value, 0, 1);
}

function normaliseColor(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 || trimmed.toLowerCase() === 'none'
        ? null
        : trimmed;
}

function normaliseFill(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.toLowerCase() === 'none') {
        return null;
    }
    return trimmed;
}

function toFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toPositiveNumber(value, fallback = null) {
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : null;
    if (numeric === null || numeric <= 0) {
        return fallback && Number.isFinite(fallback) && fallback > 0 ? fallback : null;
    }
    return numeric;
}

function toNonNegativeNumber(value, fallback = 0) {
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : null;
    if (numeric === null || numeric < 0) {
        return fallback >= 0 ? fallback : 0;
    }
    return numeric;
}

function createChineseVectorData() {
    const elements = [
        {
            type: 'roundedRect',
            x: 48,
            y: 48,
            width: 928,
            height: 928,
            radius: 64,
            stroke: '#8fbf68',
            strokeWidth: 32,
            fill: null
        },
        {
            type: 'roundedRect',
            x: 80,
            y: 80,
            width: 864,
            height: 864,
            radius: 48,
            stroke: '#cfe5b6',
            strokeWidth: 12,
            fill: null
        },
        {
            type: 'line',
            x1: 80,
            y1: 512,
            x2: 944,
            y2: 512,
            stroke: '#8fbf68',
            strokeWidth: 18,
            dash: [2, 26],
            cap: 'round',
            opacity: 0.9
        },
        {
            type: 'line',
            x1: 512,
            y1: 80,
            x2: 512,
            y2: 944,
            stroke: '#8fbf68',
            strokeWidth: 18,
            dash: [2, 26],
            cap: 'round',
            opacity: 0.9
        }
    ];

    return cloneBackgroundVectorDefinition({
        width: 1024,
        height: 1024,
        elements
    });
}

function createGraphCrossVectorData() {
    const elements = [
        {
            type: 'rect',
            x: 64,
            y: 64,
            width: 896,
            height: 896,
            stroke: '#d1d5db',
            strokeWidth: 6,
            fill: '#ffffff'
        }
    ];

    const gridColor = '#e2e8f0';
    const gridStroke = 2;
    const gridLines = [192, 320, 448, 576, 704, 832];

    gridLines.forEach((y) => {
        elements.push({
            type: 'line',
            x1: 64,
            y1: y,
            x2: 960,
            y2: y,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    });

    gridLines.forEach((x) => {
        elements.push({
            type: 'line',
            x1: x,
            y1: 64,
            x2: x,
            y2: 960,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    });

    const axisStroke = '#4b5563';
    const axisWidth = 8;
    const headLength = 36;
    const headWidth = 24;

    elements.push({
        type: 'arrow',
        x1: 80,
        y1: 512,
        x2: 944,
        y2: 512,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    elements.push({
        type: 'arrow',
        x1: 512,
        y1: 944,
        x2: 512,
        y2: 80,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    return cloneBackgroundVectorDefinition({
        width: 1024,
        height: 1024,
        elements
    });
}

function createGraphCornerVectorData() {
    const elements = [
        {
            type: 'rect',
            x: 64,
            y: 64,
            width: 896,
            height: 896,
            stroke: '#d1d5db',
            strokeWidth: 6,
            fill: '#ffffff'
        }
    ];

    const gridColor = '#e2e8f0';
    const gridStroke = 2;
    const horizontalLines = [832, 704, 576, 448, 320, 192];
    const verticalLines = [192, 320, 448, 576, 704, 832];

    horizontalLines.forEach((y) => {
        elements.push({
            type: 'line',
            x1: 64,
            y1: y,
            x2: 960,
            y2: y,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    });

    verticalLines.forEach((x) => {
        elements.push({
            type: 'line',
            x1: x,
            y1: 64,
            x2: x,
            y2: 960,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    });

    const axisStroke = '#334155';
    const axisWidth = 10;
    const headLength = 40;
    const headWidth = 26;

    elements.push({
        type: 'arrow',
        x1: 96,
        y1: 896,
        x2: 912,
        y2: 896,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    elements.push({
        type: 'arrow',
        x1: 96,
        y1: 896,
        x2: 96,
        y2: 112,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    return cloneBackgroundVectorDefinition({
        width: 1024,
        height: 1024,
        elements
    });
}

function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function getPresetById(presetId) {
    if (!presetId) {
        return null;
    }
    return PRESET_BACKGROUNDS[presetId] || null;
}

function createSvgDataUrl(svgContent) {
    if (typeof svgContent !== 'string' || svgContent.trim().length === 0) {
        return '';
    }

    const trimmed = svgContent.replace(/>\s+</g, '><').trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
}

function addBodyModalLock() {
    if (typeof document === 'undefined' || !document.body) {
        return;
    }
    document.body.classList.add('modal-open');
}

function removeBodyModalLock() {
    if (typeof document === 'undefined' || !document.body) {
        return;
    }

    if (!activeModalStudent && !isModeModalOpen) {
        document.body.classList.remove('modal-open');
    }
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
    if (channelReconnectTimer !== null) {
        clearTimeout(channelReconnectTimer);
        channelReconnectTimer = null;
    }
    isReconnecting = true;
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
