import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm';
import { calculateOverlayPlacement } from './utils/layout.mjs';

const statusBadge = document.getElementById('sessionStatusBadge');
const connectionStatus = document.getElementById('connection-status');
const studentGrid = document.getElementById('studentGrid');
const gridColumnsSelect = document.getElementById('gridColumnsSelect');
const sessionCodeEl = document.getElementById('sessionCode');
const sessionUrlInput = document.getElementById('sessionUrl');
const copyBtn = document.getElementById('copyBtn');
const referenceInput = document.getElementById('referenceImage');
const clearImageBtn = document.getElementById('clearImageBtn');
const referencePreview = document.getElementById('referencePreview');
const referencePreviewImage = document.getElementById('referencePreviewImage');
const referencePreviewPlaceholder = document.getElementById('referencePreviewPlaceholder');
const referenceFileName = document.getElementById('referenceFileName');
const startQuestionBtn = document.getElementById('startQuestionBtn');
const startQuestionLabel = document.getElementById('startQuestionLabel');
const startQuestionNumber = document.getElementById('startQuestionNumber');
const modeStatus = document.getElementById('modeStatus');
const presetSummary = document.getElementById('presetSummary');
const modeChoiceButtons = Array.from(document.querySelectorAll('[data-mode-choice]'));
const modePanels = Array.from(document.querySelectorAll('[data-mode-panel]'));
const studentModal = document.getElementById('studentModal');
const studentModalCanvas = document.getElementById('studentModalCanvas');
const studentModalTitle = document.getElementById('studentModalTitle');
const studentModalSubtitle = document.getElementById('studentModalSubtitle');
const studentModalClose = document.getElementById('studentModalClose');
const teacherOverlayCanvas = document.getElementById('teacherOverlayCanvas');
const teacherToolbar = document.querySelector('.teacher-toolbar');
const teacherPenToggle = document.getElementById('teacherPenToggle');
const teacherClearButton = document.getElementById('teacherClearButton');
const teacherPenSwatches = Array.from(document.querySelectorAll('[data-pen-colour]'));
const teacherToolButtons = Array.from(document.querySelectorAll('[data-teacher-tool]'));
const teacherBrushButton = document.getElementById('teacherBrushSizeButton');
const teacherBrushPopover = document.getElementById('teacherBrushSizePopover');
const teacherBrushSlider = document.getElementById('teacherBrushSizeSlider');
const teacherBrushValueLabel = document.getElementById('teacherBrushSizeValue');
const teacherBrushIndicator = document.getElementById('teacherBrushSizeIndicator');
const teacherBrushPreviewDot = document.getElementById('teacherBrushPreviewDot');
const teacherUndoButton = document.getElementById('teacherUndoButton');
const teacherRedoButton = document.getElementById('teacherRedoButton');
const teacherStylusModeButton = document.getElementById('teacherStylusModeButton');
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
            <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
                <defs>
                    <marker id="arrow-head-cross" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,1 L9,6 L0,11 Z" fill="#1f2937"/>
                    </marker>
                </defs>
                <rect width="800" height="600" fill="#f8fafc"/>
                <rect x="40" y="40" width="720" height="520" rx="18" ry="18" fill="#ffffff" stroke="#cbd5f5" stroke-width="4"/>
                <g stroke="#e2e8f0" stroke-width="2">
                    <path d="M40 100 H760"/>
                    <path d="M40 160 H760"/>
                    <path d="M40 220 H760"/>
                    <path d="M40 280 H760"/>
                    <path d="M40 340 H760"/>
                    <path d="M40 400 H760"/>
                    <path d="M40 460 H760"/>
                    <path d="M40 520 H760"/>
                    <path d="M100 40 V560"/>
                    <path d="M160 40 V560"/>
                    <path d="M220 40 V560"/>
                    <path d="M280 40 V560"/>
                    <path d="M340 40 V560"/>
                    <path d="M400 40 V560"/>
                    <path d="M460 40 V560"/>
                    <path d="M520 40 V560"/>
                    <path d="M580 40 V560"/>
                    <path d="M640 40 V560"/>
                    <path d="M700 40 V560"/>
                </g>
                <line x1="40" y1="300" x2="760" y2="300" stroke="#1f2937" stroke-width="6" stroke-linecap="round" marker-end="url(#arrow-head-cross)"/>
                <line x1="400" y1="560" x2="400" y2="40" stroke="#1f2937" stroke-width="6" stroke-linecap="round" marker-end="url(#arrow-head-cross)"/>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
                <defs>
                    <marker id="arrow-head-corner" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,1 L9,6 L0,11 Z" fill="#1f2937"/>
                    </marker>
                </defs>
                <rect width="800" height="600" fill="#f8fafc"/>
                <rect x="40" y="40" width="720" height="520" rx="18" ry="18" fill="#ffffff" stroke="#cbd5f5" stroke-width="4"/>
                <g stroke="#e2e8f0" stroke-width="2">
                    <path d="M40 100 H760"/>
                    <path d="M40 160 H760"/>
                    <path d="M40 220 H760"/>
                    <path d="M40 280 H760"/>
                    <path d="M40 340 H760"/>
                    <path d="M40 400 H760"/>
                    <path d="M40 460 H760"/>
                    <path d="M40 520 H760"/>
                    <path d="M100 40 V560"/>
                    <path d="M160 40 V560"/>
                    <path d="M220 40 V560"/>
                    <path d="M280 40 V560"/>
                    <path d="M340 40 V560"/>
                    <path d="M400 40 V560"/>
                    <path d="M460 40 V560"/>
                    <path d="M520 40 V560"/>
                    <path d="M580 40 V560"/>
                    <path d="M640 40 V560"/>
                    <path d="M700 40 V560"/>
                </g>
                <line x1="40" y1="560" x2="760" y2="560" stroke="#1f2937" stroke-width="6" stroke-linecap="round" marker-end="url(#arrow-head-corner)"/>
                <line x1="40" y1="560" x2="40" y2="40" stroke="#1f2937" stroke-width="6" stroke-linecap="round" marker-end="url(#arrow-head-corner)"/>
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
let selectedMode = 'whiteboard';
let modeOptionButtons = [];
let modePreviewImages = [];
let isModeModalOpen = false;
let modeModalReturnFocus = null;
let studentModalResizeObserver = null;
let teacherOverlayCtx = teacherOverlayCanvas ? teacherOverlayCanvas.getContext('2d') : null;
let teacherPenActive = false;
let teacherPenStudent = null;
let teacherPenDrawing = false;
let teacherPenCurrentPath = null;
let teacherPenColour = '#111827';
let teacherEraserAction = null;
const TEACHER_TOOL_TYPES = Object.freeze({
    PEN: 'pen',
    ERASER: 'eraser'
});
const TEACHER_DEFAULT_BRUSH_SIZE = 6;
const TEACHER_MIN_BRUSH_SIZE = 1;
const TEACHER_MAX_BRUSH_SIZE = 12;
const TEACHER_MAX_STROKE_WIDTH = TEACHER_MAX_BRUSH_SIZE;
const TEACHER_BRUSH_STORAGE_KEY = 'teacher-brush-size';
const TEACHER_STYLUS_STORAGE_KEY = 'teacher-stylus-only';
const TEACHER_ERASER_HITBOX_PADDING = 6;
let teacherActiveTool = TEACHER_TOOL_TYPES.PEN;
let teacherBrushSize = readTeacherBrushSize();
let teacherStylusOnly = readTeacherStylusPreference();
let teacherPenControlsReady = false;
let teacherBrushPopoverOpen = false;
let teacherBrushPopoverReturnFocus = null;
const teacherStrokeDrawState = {
    buffer: [],
    history: [],
    rafId: null,
    stroke: null
};
const presenceKey = `teacher-${Math.random().toString(36).slice(2, 10)}`;
const students = new Map();
const GRID_STORAGE_KEY = 'teacher-grid-columns';

const RELIABLE_EVENT_LIMIT = 64;
let reliableSequence = 0;
const reliableEventLog = [];

const CHANNEL_RECONNECT_DELAY = 2000;
let channelReconnectTimer = null;
let isReconnecting = false;

const SEND_QUEUE_LIMIT = 256;
const sendQueue = [];
let sendInFlight = false;

let teacherAnnotationBroadcastTimer = null;
let teacherAnnotationBroadcastPendingStudent = null;
let teacherAnnotationBroadcastReason = 'update';
let teacherAnnotationIdCounter = 0;

function createTeacherAnnotationId() {
    teacherAnnotationIdCounter += 1;
    return `tap-${Date.now().toString(36)}-${teacherAnnotationIdCounter.toString(36)}`;
}

function ensureTeacherPathId(path) {
    if (!path || typeof path !== 'object') {
        return null;
    }

    if (typeof path.id === 'string' && path.id.trim().length > 0) {
        return path.id;
    }

    const id = createTeacherAnnotationId();
    path.id = id;
    return id;
}

function ensureTeacherAnnotationStreamState(student) {
    if (!student) {
        return null;
    }

    if (!student.teacherAnnotationStream || typeof student.teacherAnnotationStream !== 'object') {
        student.teacherAnnotationStream = {
            order: [],
            paths: new Map(),
            width: BASE_CANVAS_WIDTH,
            height: BASE_CANVAS_HEIGHT
        };
    }

    return student.teacherAnnotationStream;
}

function ensureTeacherPenCollections(student) {
    if (!student) {
        return null;
    }

    if (!Array.isArray(student.teacherAnnotations)) {
        student.teacherAnnotations = [];
    }

    student.teacherAnnotations.forEach((path) => {
        if (path) {
            ensureTeacherPathId(path);
        }
    });

    if (!Array.isArray(student.teacherHistory)) {
        student.teacherHistory = [];
    }

    if (!Array.isArray(student.teacherRedoStack)) {
        student.teacherRedoStack = [];
    }

    if (typeof student.teacherHasReviewed !== 'boolean') {
        student.teacherHasReviewed = false;
    }

    return student;
}

function updateStudentReviewUi(student) {
    if (!student) {
        return;
    }

    const reviewed = Boolean(student.teacherHasReviewed);
    if (student.reviewBadge) {
        student.reviewBadge.hidden = !reviewed;
    }

    if (student.container) {
        student.container.classList.toggle('student-card--reviewed', reviewed);
    }

    if (teacherPenStudent === student) {
        updateStudentModalMeta(student);
    }
}

function markStudentReviewed(student) {
    const target = ensureTeacherPenCollections(student);
    if (!target) {
        return;
    }

    if (!target.teacherHasReviewed) {
        target.teacherHasReviewed = true;
    }

    updateStudentReviewUi(target);
}

function clearStudentReview(student) {
    if (!student) {
        return;
    }

    if (student.teacherHasReviewed) {
        student.teacherHasReviewed = false;
    }
    updateStudentReviewUi(student);
}

function recordTeacherHistory(student, action, options = {}) {
    const target = ensureTeacherPenCollections(student);
    if (!target || !action) {
        return null;
    }

    const { clearRedo = true } = options;
    let entry = action;

    if (action.type === 'clear') {
        const paths = Array.isArray(action.paths)
            ? cloneTeacherAnnotations(action.paths)
            : cloneTeacherAnnotations(target.teacherAnnotations);
        entry = { type: 'clear', paths };
    } else if (action.type === 'erase') {
        if (Array.isArray(action.entries)) {
            const entries = action.entries
                .map((item) => {
                    if (!item || !item.path) {
                        return null;
                    }

                    const index = typeof item.index === 'number' && Number.isFinite(item.index)
                        ? Math.floor(item.index)
                        : null;

                    return {
                        path: item.path,
                        index
                    };
                })
                .filter(Boolean);

            if (entries.length === 0) {
                return null;
            }

            entry = { type: 'erase', entries };
        } else if (action.path) {
            const index = typeof action.index === 'number' && Number.isFinite(action.index)
                ? Math.floor(action.index)
                : null;

            entry = {
                type: 'erase',
                path: action.path,
                index
            };
        } else {
            return null;
        }
    }

    target.teacherHistory.push(entry);

    if (clearRedo && Array.isArray(target.teacherRedoStack)) {
        target.teacherRedoStack.length = 0;
    }

    return entry;
}

function appendTeacherEraserRemoval(student, removal) {
    if (!removal || !removal.path) {
        return;
    }

    const target = ensureTeacherPenCollections(student);
    if (!target) {
        return;
    }

    if (!teacherEraserAction || teacherEraserAction.student !== target) {
        teacherEraserAction = {
            student: target,
            entries: []
        };
    }

    const index = typeof removal.index === 'number' && Number.isFinite(removal.index)
        ? Math.max(0, Math.floor(removal.index))
        : target.teacherAnnotations.length;

    teacherEraserAction.entries.push({
        path: removal.path,
        index
    });
}

function completeTeacherEraserAction(options = {}) {
    const { cancel = false } = options;
    const action = teacherEraserAction;
    teacherEraserAction = null;

    if (!action || cancel) {
        return null;
    }

    const target = ensureTeacherPenCollections(action.student);
    if (!target) {
        return null;
    }

    const entries = Array.isArray(action.entries)
        ? action.entries.filter((entry) => entry && entry.path)
        : [];

    if (entries.length === 0) {
        return null;
    }

    return recordTeacherHistory(target, {
        type: 'erase',
        entries: entries.map((entry) => ({
            path: entry.path,
            index: entry.index
        }))
    });
}

function normaliseTeacherEraseEntries(action) {
    if (!action) {
        return [];
    }

    if (Array.isArray(action.entries)) {
        return action.entries
            .map((entry) => {
                if (!entry || !entry.path) {
                    return null;
                }

                const index = typeof entry.index === 'number' && Number.isFinite(entry.index)
                    ? Math.floor(entry.index)
                    : null;

                return {
                    path: entry.path,
                    index
                };
            })
            .filter(Boolean);
    }

    if (action.path) {
        const index = typeof action.index === 'number' && Number.isFinite(action.index)
            ? Math.floor(action.index)
            : null;

        return [{ path: action.path, index }];
    }

    return [];
}

function hydrateTeacherHistoryFromAnnotations(student) {
    const target = ensureTeacherPenCollections(student);
    if (!target) {
        return;
    }

    if (!Array.isArray(target.teacherAnnotations) || target.teacherAnnotations.length === 0) {
        return;
    }

    if (Array.isArray(target.teacherHistory) && target.teacherHistory.length > 0) {
        return;
    }

    target.teacherHistory = target.teacherAnnotations.map((path, index) => ({
        type: 'draw',
        path: path ? (ensureTeacherPathId(path), path) : path,
        index
    }));

    if (!Array.isArray(target.teacherRedoStack)) {
        target.teacherRedoStack = [];
    } else {
        target.teacherRedoStack.length = 0;
    }
}

function findTeacherAnnotationIndex(annotations, path, fallbackIndex = null) {
    if (!Array.isArray(annotations)) {
        return -1;
    }

    const index = annotations.indexOf(path);
    if (index !== -1) {
        return index;
    }

    if (typeof fallbackIndex === 'number' && Number.isFinite(fallbackIndex)) {
        const clamped = clampAnnotationIndex(fallbackIndex, annotations.length);
        if (clamped >= 0 && clamped < annotations.length) {
            return clamped;
        }
    }

    return -1;
}

function clampAnnotationIndex(index, length) {
    if (!Number.isFinite(length)) {
        return 0;
    }

    const maxIndex = Math.max(0, Math.floor(length) - 1);

    if (!Number.isFinite(index)) {
        return maxIndex;
    }

    const numericIndex = Math.floor(index);
    return Math.max(0, Math.min(numericIndex, maxIndex));
}

function clampTeacherInsertionIndex(index, length) {
    if (!Number.isFinite(length)) {
        return 0;
    }

    const maxIndex = Math.max(0, Math.floor(length));

    if (!Number.isFinite(index)) {
        return maxIndex;
    }

    const numericIndex = Math.floor(index);
    return Math.max(0, Math.min(numericIndex, maxIndex));
}

const sessionState = {
    questionNumber: 0,
    lastQuestionStartedAt: Date.now(),
    backgroundVersion: 0,
    backgroundName: null,
    backgroundActive: false,
    lastSequence: 0,
    lastBackgroundUpdateAt: Date.now(),
    isQuestionActive: false,
    currentMode: {
        type: 'waiting',
        label: 'Waiting to start'
    }
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
    setupQuestionControls();
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
        refreshModeStatus();
        updateStartButtonState();

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
    clearSendQueue();
    stopSyncLoop();
    if (copyBtn) {
        copyBtn.disabled = true;
    }
    refreshModeStatus();
    updateStartButtonState();
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
    const hasImage = Boolean(imageData);
    const hasVector = Boolean(activeBackgroundVectors);
    const label = meta.name || meta.label || null;

    sessionState.backgroundActive = hasImage || hasVector;
    sessionState.backgroundVersion += 1;
    sessionState.backgroundName = label;
    sessionState.lastBackgroundUpdateAt = Date.now();
}

function advanceQuestionState(modeDescriptor = null) {
    sessionState.questionNumber += 1;
    sessionState.lastQuestionStartedAt = Date.now();
    sessionState.backgroundActive = Boolean(activeBackgroundImage) || Boolean(activeBackgroundVectors);
    sessionState.isQuestionActive = true;

    if (modeDescriptor && typeof modeDescriptor === 'object') {
        sessionState.currentMode = {
            type: modeDescriptor.type || selectedMode,
            label: modeDescriptor.label || 'Question',
            description: modeDescriptor.description || null
        };
        if (modeDescriptor.label) {
            sessionState.backgroundName = modeDescriptor.label;
        }
    } else {
        sessionState.currentMode = {
            type: selectedMode,
            label: 'Question',
            description: null
        };
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
        lastBackgroundUpdateAt: sessionState.lastBackgroundUpdateAt,
        isQuestionActive: sessionState.isQuestionActive,
        currentMode: sessionState.currentMode
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
            const student = students.get(payload.username);
            if (student) {
                sendTeacherAnnotationsToStudent(student, 'sync');
            }
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
        const student = students.get(username);
        if (student) {
            sendTeacherAnnotationsToStudent(student, 'sync');
        }
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
                    const student = students.get(entry.username);
                    if (student) {
                        sendTeacherAnnotationsToStudent(student, 'sync');
                    }
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

    const reviewBadge = document.createElement('span');
    reviewBadge.className = 'student-card__badge';
    reviewBadge.textContent = 'Reviewed';
    reviewBadge.hidden = true;

    const identityWrap = document.createElement('div');
    identityWrap.className = 'student-card__info';
    identityWrap.appendChild(identity);
    identityWrap.appendChild(reviewBadge);

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'student-card__expand';
    expandBtn.textContent = 'Expand';
    expandBtn.addEventListener('click', () => openStudentModal(username, expandBtn));

    const updatedAt = document.createElement('p');
    updatedAt.className = 'student-card__meta';
    updatedAt.textContent = 'Awaiting activity';

    header.appendChild(identityWrap);
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
    insertStudentCardSorted(container, username);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaleRatio = canvas.width / 800;
    ctx.scale(scaleRatio, scaleRatio);

    const student = {
        username,
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
        previewCtx: null,
        teacherAnnotations: [],
        teacherHistory: [],
        teacherRedoStack: [],
        teacherHasReviewed: false,
        reviewBadge
    };

    students.set(username, student);
    updateStudentReviewUi(student);
    return student;
}

function insertStudentCardSorted(cardElement, username) {
    if (!studentGrid) {
        return;
    }

    const lowerUsername = username.toLowerCase();
    const cards = Array.from(studentGrid.children);
    for (const existingCard of cards) {
        const existingUsername = existingCard.getAttribute('data-username') || '';
        if (lowerUsername.localeCompare(existingUsername.toLowerCase(), undefined, { numeric: true }) < 0) {
            studentGrid.insertBefore(cardElement, existingCard);
            return;
        }
    }

    studentGrid.appendChild(cardElement);
}

function updateStudentCanvas(username, canvasState) {
    const student = students.get(username);
    if (!student || !canvasState) return;

    clearStudentReview(student);

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

    setupTeacherPenControls();
}

function setupTeacherPenControls() {
    if (teacherPenControlsReady) {
        return;
    }

    if (!teacherOverlayCanvas) {
        return;
    }

    teacherOverlayCtx = teacherOverlayCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!teacherOverlayCtx) {
        return;
    }

    teacherOverlayCanvas.width = BASE_CANVAS_WIDTH;
    teacherOverlayCanvas.height = BASE_CANVAS_HEIGHT;

    teacherOverlayCanvas.style.touchAction = 'none';

    const pointerListenerOptions = { passive: false };
    teacherOverlayCanvas.addEventListener('pointerdown', handleTeacherPenPointerDown, pointerListenerOptions);
    teacherOverlayCanvas.addEventListener('pointermove', handleTeacherPenPointerMove, pointerListenerOptions);
    teacherOverlayCanvas.addEventListener('pointerup', handleTeacherPenPointerUp, pointerListenerOptions);
    teacherOverlayCanvas.addEventListener('pointerleave', handleTeacherPenPointerUp, pointerListenerOptions);
    teacherOverlayCanvas.addEventListener('pointercancel', handleTeacherPenPointerUp, pointerListenerOptions);
    teacherOverlayCanvas.addEventListener('lostpointercapture', handleTeacherPenPointerUp);

    if (teacherPenToggle) {
        teacherPenToggle.addEventListener('click', () => {
            setTeacherPenActive(!teacherPenActive);
        });
    }

    teacherPenSwatches.forEach((swatch) => {
        if (!swatch) {
            return;
        }
        swatch.addEventListener('click', () => {
            const colour = swatch.dataset.penColour;
            if (colour) {
                setTeacherPenColour(colour);
            }
        });
    });

    teacherToolButtons.forEach((button) => {
        const tool = button?.dataset?.teacherTool;
        if (!tool) {
            return;
        }
        button.addEventListener('click', () => {
            setTeacherTool(tool);
        });
    });

    if (teacherBrushButton && teacherBrushPopover) {
        teacherBrushButton.addEventListener('click', () => {
            toggleTeacherBrushPopover();
        });
    }

    if (teacherBrushSlider) {
        teacherBrushSlider.addEventListener('input', (event) => {
            const value = Number(event.target.value);
            setTeacherBrushSize(value, { updateSlider: false });
        });
    }

    if (teacherUndoButton) {
        teacherUndoButton.addEventListener('click', () => {
            undoTeacherAnnotation();
        });
    }

    if (teacherRedoButton) {
        teacherRedoButton.addEventListener('click', () => {
            redoTeacherAnnotation();
        });
    }

    if (teacherClearButton) {
        teacherClearButton.addEventListener('click', () => {
            clearTeacherPenAnnotations();
        });
    }

    if (teacherStylusModeButton) {
        teacherStylusModeButton.addEventListener('click', () => {
            setTeacherStylusOnly(!teacherStylusOnly);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && teacherBrushPopoverOpen) {
            closeTeacherBrushPopover();
        }
    });

    document.addEventListener('pointerdown', (event) => {
        if (!teacherBrushPopoverOpen || !teacherBrushPopover) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Node)) {
            return;
        }
        if (teacherBrushPopover.contains(target)) {
            return;
        }
        if (teacherBrushButton && teacherBrushButton.contains(target)) {
            return;
        }
        closeTeacherBrushPopover();
    });

    setTeacherPenColour(teacherPenColour);
    setTeacherTool(teacherActiveTool);
    setTeacherBrushSize(teacherBrushSize, { updateSlider: true, silent: true });
    setTeacherStylusOnly(teacherStylusOnly, { persist: false, silent: true });
    teacherPenControlsReady = true;
    updateTeacherPenUi();
    renderTeacherAnnotations();
}

function setTeacherPenActive(active) {
    const hasStudent = Boolean(teacherPenStudent);
    teacherPenActive = Boolean(active) && hasStudent;

    if (teacherPenActive && teacherActiveTool !== TEACHER_TOOL_TYPES.PEN) {
        setTeacherTool(TEACHER_TOOL_TYPES.PEN);
    }

    if (!teacherPenActive) {
        teacherPenDrawing = false;
        teacherPenCurrentPath = null;
        completeTeacherEraserAction({ cancel: true });
        closeTeacherBrushPopover();
        resetTeacherStrokeDrawState();
    }

    if (teacherOverlayCanvas) {
        teacherOverlayCanvas.style.pointerEvents = teacherPenActive ? 'auto' : 'none';
        teacherOverlayCanvas.style.touchAction = teacherPenActive ? 'none' : 'auto';
    }

    updateTeacherPenUi();
}

function setTeacherPenColour(colour) {
    if (typeof colour !== 'string' || colour.trim().length === 0) {
        return;
    }

    teacherPenColour = colour;

    if (teacherActiveTool !== TEACHER_TOOL_TYPES.PEN) {
        setTeacherTool(TEACHER_TOOL_TYPES.PEN);
    }

    teacherPenSwatches.forEach((swatch) => {
        if (!swatch) {
            return;
        }
        const isActive = swatch.dataset.penColour === colour;
        swatch.classList.toggle('is-active', isActive);
        swatch.setAttribute('aria-pressed', String(isActive));
    });

    updateTeacherBrushUi({ updateSlider: false });
}

function setTeacherTool(tool) {
    if (typeof tool !== 'string') {
        return;
    }

    const normalised = tool.toLowerCase();
    if (!Object.values(TEACHER_TOOL_TYPES).includes(normalised)) {
        return;
    }

    teacherActiveTool = normalised;

    teacherToolButtons.forEach((button) => {
        if (!button) {
            return;
        }
        const isActive = button.dataset.teacherTool === normalised;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    updateTeacherBrushUi({ updateSlider: false });
    updateTeacherPenUi();
}

function getTeacherOverlayPoint(event) {
    if (!teacherOverlayCanvas) {
        return null;
    }

    const rect = teacherOverlayCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        return null;
    }

    const scaleX = teacherOverlayCanvas.width / rect.width;
    const scaleY = teacherOverlayCanvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }

    return { x, y };
}

function eraseTeacherAnnotationsAtPoint(x, y) {
    const student = ensureTeacherPenCollections(teacherPenStudent);
    if (!student || !Array.isArray(student.teacherAnnotations) || student.teacherAnnotations.length === 0) {
        return null;
    }

    for (let i = student.teacherAnnotations.length - 1; i >= 0; i -= 1) {
        const path = student.teacherAnnotations[i];
        if (!path) {
            continue;
        }

        if (teacherPathContainsPoint(path, x, y)) {
            student.teacherAnnotations.splice(i, 1);
            return { path, index: i };
        }
    }

    return null;
}

function teacherPathContainsPoint(path, x, y) {
    if (!path) {
        return false;
    }

    const points = normaliseStudentPoints(path.points || []);
    if (points.length === 0) {
        return false;
    }

    const baseWidth = typeof path.width === 'number' && Number.isFinite(path.width)
        ? clampNumber(path.width, TEACHER_MIN_BRUSH_SIZE, TEACHER_MAX_STROKE_WIDTH)
        : TEACHER_MIN_BRUSH_SIZE;

    const padding = Math.max(baseWidth * 0.6, 12) + TEACHER_ERASER_HITBOX_PADDING;
    const bounds = getTeacherPathBounds(points);

    if (bounds) {
        if (x < bounds.minX - padding || x > bounds.maxX + padding || y < bounds.minY - padding || y > bounds.maxY + padding) {
            return false;
        }
    }

    if (points.length === 1) {
        const [point] = points;
        return distanceSquared(point.x, point.y, x, y) <= padding * padding;
    }

    for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        if (distanceToSegmentSquared(x, y, previous.x, previous.y, current.x, current.y) <= padding * padding) {
            return true;
        }
    }

    const lastPoint = points[points.length - 1];
    return distanceSquared(lastPoint.x, lastPoint.y, x, y) <= padding * padding;
}

function getTeacherPathBounds(points) {
    if (!Array.isArray(points) || points.length === 0) {
        return null;
    }

    return points.reduce((accumulator, point) => ({
        minX: Math.min(accumulator.minX, point.x),
        minY: Math.min(accumulator.minY, point.y),
        maxX: Math.max(accumulator.maxX, point.x),
        maxY: Math.max(accumulator.maxY, point.y)
    }), {
        minX: points[0].x,
        minY: points[0].y,
        maxX: points[0].x,
        maxY: points[0].y
    });
}

function distanceSquared(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;

    if (dx === 0 && dy === 0) {
        return distanceSquared(px, py, ax, ay);
    }

    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const closestX = ax + clamped * dx;
    const closestY = ay + clamped * dy;
    return distanceSquared(px, py, closestX, closestY);
}

function updateTeacherPenUi() {
    const hasStudent = Boolean(teacherPenStudent);
    const toggleActive = teacherPenActive && hasStudent;
    const controlsLocked = hasStudent && !toggleActive;
    const annotations = hasStudent && Array.isArray(teacherPenStudent.teacherAnnotations)
        ? teacherPenStudent.teacherAnnotations
        : [];
    const history = hasStudent && Array.isArray(teacherPenStudent.teacherHistory)
        ? teacherPenStudent.teacherHistory
        : [];
    const redoStack = hasStudent && Array.isArray(teacherPenStudent.teacherRedoStack)
        ? teacherPenStudent.teacherRedoStack
        : [];
    const hasAnnotations = annotations.length > 0;
    const canUndo = history.length > 0;
    const hasRedo = redoStack.length > 0;

    if (teacherPenToggle) {
        teacherPenToggle.disabled = !hasStudent;
        teacherPenToggle.setAttribute('aria-pressed', String(toggleActive));
        teacherPenToggle.classList.toggle('is-disabled', !hasStudent);
        teacherPenToggle.classList.toggle('is-active', toggleActive);
        teacherPenToggle.classList.toggle('is-prompt', controlsLocked);
        const toggleLabel = toggleActive ? 'Stop annotating' : 'Start annotating';
        teacherPenToggle.setAttribute('aria-label', toggleLabel);
        if (teacherPenToggle.dataset) {
            teacherPenToggle.dataset.tooltip = toggleLabel;
        }
    }

    if (teacherToolbar) {
        teacherToolbar.classList.toggle('is-disabled', !hasStudent);
        teacherToolbar.classList.toggle('is-locked', controlsLocked);
    }

    teacherPenSwatches.forEach((swatch) => {
        if (!swatch) {
            return;
        }
        const isActive = swatch.dataset.penColour === teacherPenColour;
        swatch.classList.toggle('is-active', isActive);
        swatch.setAttribute('aria-pressed', String(isActive));
        swatch.disabled = !hasStudent || controlsLocked;
    });

    teacherToolButtons.forEach((button) => {
        if (!button) {
            return;
        }
        const isActive = button.dataset.teacherTool === teacherActiveTool;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
        button.disabled = !hasStudent || controlsLocked;
    });

    if (teacherBrushButton) {
        teacherBrushButton.disabled = !hasStudent || controlsLocked;
        teacherBrushButton.setAttribute('aria-expanded', teacherBrushPopoverOpen ? 'true' : 'false');
    }

    if (teacherStylusModeButton) {
        const stylusLabel = getTeacherStylusModeLabel();
        teacherStylusModeButton.disabled = !hasStudent || controlsLocked;
        teacherStylusModeButton.classList.toggle('is-active', teacherStylusOnly);
        teacherStylusModeButton.classList.toggle('is-muted', hasStudent && !toggleActive);
        teacherStylusModeButton.setAttribute('aria-pressed', teacherStylusOnly ? 'true' : 'false');
        teacherStylusModeButton.setAttribute('aria-label', stylusLabel);
        if (teacherStylusModeButton.dataset) {
            teacherStylusModeButton.dataset.tooltip = stylusLabel;
        }
    }

    if (teacherUndoButton) {
        teacherUndoButton.disabled = !toggleActive || !canUndo;
    }

    if (teacherRedoButton) {
        teacherRedoButton.disabled = !toggleActive || !hasRedo;
    }

    if (teacherClearButton) {
        teacherClearButton.disabled = !hasAnnotations || !toggleActive;
    }

    updateTeacherBrushUi({ updateSlider: true });
}

function setTeacherBrushSize(value, options = {}) {
    const { updateSlider = true, silent = false } = options || {};
    const fallback = Number.isFinite(teacherBrushSize) ? teacherBrushSize : TEACHER_DEFAULT_BRUSH_SIZE;
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    const clamped = clampTeacherBrushSize(numeric);

    teacherBrushSize = clamped;
    updateTeacherBrushUi({ updateSlider });

    if (!silent) {
        writeTeacherBrushSize(clamped);
    }
}

function updateTeacherBrushUi({ updateSlider = true } = {}) {
    const brushSize = clampTeacherBrushSize(teacherBrushSize);
    const formatted = formatTeacherBrushSize(brushSize);
    const previewSize = getTeacherBrushPreviewSize(brushSize);
    const previewColour = getTeacherBrushPreviewColour();
    const previewOpacity = getTeacherBrushPreviewOpacity();

    if (teacherBrushSlider) {
        if (updateSlider) {
            const currentValue = Number(teacherBrushSlider.value);
            if (!Number.isFinite(currentValue) || Math.abs(currentValue - brushSize) > 0.05) {
                teacherBrushSlider.value = formatted;
            }
        }
        teacherBrushSlider.setAttribute('aria-valuenow', formatted);
        teacherBrushSlider.setAttribute('aria-valuetext', `${formatted} pixels`);
    }

    if (teacherBrushValueLabel) {
        teacherBrushValueLabel.textContent = `${formatted} px`;
    }

    if (teacherBrushPreviewDot) {
        teacherBrushPreviewDot.style.setProperty('--brush-preview-size', `${previewSize}px`);
        teacherBrushPreviewDot.style.background = previewColour;
        teacherBrushPreviewDot.style.opacity = String(previewOpacity);
    }

    if (teacherBrushIndicator) {
        const indicatorSize = Math.max(8, Math.round(previewSize * 0.65));
        teacherBrushIndicator.style.setProperty('--brush-preview-size', `${indicatorSize}px`);
        teacherBrushIndicator.style.background = previewColour;
        teacherBrushIndicator.style.opacity = String(previewOpacity);
        teacherBrushIndicator.classList.toggle('is-eraser', teacherActiveTool === TEACHER_TOOL_TYPES.ERASER);
    }

    if (teacherBrushButton) {
        teacherBrushButton.setAttribute('aria-expanded', teacherBrushPopoverOpen ? 'true' : 'false');
    }
}

function toggleTeacherBrushPopover() {
    if (teacherBrushPopoverOpen) {
        closeTeacherBrushPopover();
    } else {
        openTeacherBrushPopover();
    }
}

function openTeacherBrushPopover() {
    if (!teacherBrushPopover || !teacherBrushButton || !teacherPenStudent) {
        return;
    }

    teacherBrushPopover.hidden = false;
    teacherBrushPopoverOpen = true;
    teacherBrushPopoverReturnFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : teacherBrushButton;
    teacherBrushButton.setAttribute('aria-expanded', 'true');
    updateTeacherBrushUi({ updateSlider: true });
    if (teacherBrushSlider) {
        teacherBrushSlider.focus();
    } else {
        teacherBrushPopover.focus?.();
    }
}

function closeTeacherBrushPopover() {
    if (!teacherBrushPopoverOpen || !teacherBrushPopover) {
        return;
    }

    teacherBrushPopover.hidden = true;
    teacherBrushPopoverOpen = false;

    if (teacherBrushButton) {
        teacherBrushButton.setAttribute('aria-expanded', 'false');
    }

    const returnTarget = teacherBrushPopoverReturnFocus;
    teacherBrushPopoverReturnFocus = null;
    if (returnTarget && typeof returnTarget.focus === 'function') {
        setTimeout(() => {
            returnTarget.focus();
        }, 0);
    }
}

function undoTeacherAnnotation() {
    const student = ensureTeacherPenCollections(teacherPenStudent);
    if (!student) {
        return;
    }

    const history = Array.isArray(student.teacherHistory) ? student.teacherHistory : [];
    if (history.length === 0) {
        return;
    }

    const action = history.pop();
    if (!action) {
        return;
    }

    let changed = false;
    let broadcastReason = 'update';

    if (action.type === 'draw') {
        const index = findTeacherAnnotationIndex(student.teacherAnnotations, action.path, action.index);
        if (index !== -1) {
            const [removed] = student.teacherAnnotations.splice(index, 1);
            student.teacherRedoStack.push({ type: 'draw', path: removed, index });
            changed = true;
        }
    } else if (action.type === 'erase') {
        const entries = normaliseTeacherEraseEntries(action);
        if (entries.length > 0) {
            const redoEntries = [];
            for (let i = entries.length - 1; i >= 0; i -= 1) {
                const entry = entries[i];
                const insertIndex = clampTeacherInsertionIndex(
                    typeof entry.index === 'number' ? entry.index : student.teacherAnnotations.length,
                    student.teacherAnnotations.length
                );
                student.teacherAnnotations.splice(insertIndex, 0, entry.path);
                redoEntries.push({ path: entry.path, index: insertIndex });
            }

            if (redoEntries.length > 0) {
                redoEntries.reverse();
                student.teacherRedoStack.push({ type: 'erase', entries: redoEntries });
            }

            changed = true;
        }
    } else if (action.type === 'clear') {
        const restored = cloneTeacherAnnotations(action.paths);
        student.teacherAnnotations = restored;
        student.teacherRedoStack.push({ type: 'clear', paths: cloneTeacherAnnotations(action.paths) });
        changed = true;
    }

    if (!changed) {
        return;
    }

    renderTeacherAnnotations();
    updateTeacherPenUi();
    queueTeacherAnnotationBroadcast(broadcastReason, true);
}

function redoTeacherAnnotation() {
    const student = ensureTeacherPenCollections(teacherPenStudent);
    if (!student) {
        return;
    }

    const redoStack = Array.isArray(student.teacherRedoStack) ? student.teacherRedoStack : [];
    if (redoStack.length === 0) {
        return;
    }

    const action = redoStack.pop();
    if (!action) {
        return;
    }

    let changed = false;
    let broadcastReason = 'update';

    if (action.type === 'draw') {
        const index = clampAnnotationIndex(action.index, student.teacherAnnotations.length + 1);
        student.teacherAnnotations.splice(index, 0, action.path);
        recordTeacherHistory(student, { type: 'draw', path: action.path, index }, { clearRedo: false });
        changed = true;
    } else if (action.type === 'erase') {
        const entries = normaliseTeacherEraseEntries(action);
        if (entries.length > 0) {
            const performed = [];
            entries.forEach((entry) => {
                if (!entry.path) {
                    return;
                }

                let removalIndex = findTeacherAnnotationIndex(student.teacherAnnotations, entry.path, entry.index);
                if (removalIndex === -1 && typeof entry.index === 'number') {
                    removalIndex = clampAnnotationIndex(entry.index, student.teacherAnnotations.length);
                }

                if (removalIndex !== -1 && removalIndex < student.teacherAnnotations.length) {
                    const [removed] = student.teacherAnnotations.splice(removalIndex, 1);
                    if (removed) {
                        performed.push({ path: removed, index: removalIndex });
                    }
                }
            });

            if (performed.length > 0) {
                recordTeacherHistory(student, { type: 'erase', entries: performed }, { clearRedo: false });
                changed = true;
            }
        }
    } else if (action.type === 'clear') {
        const snapshot = cloneTeacherAnnotations(student.teacherAnnotations);
        recordTeacherHistory(student, { type: 'clear', paths: snapshot }, { clearRedo: false });
        student.teacherAnnotations = [];
        broadcastReason = 'clear';
        changed = true;
    }

    if (!changed) {
        return;
    }

    renderTeacherAnnotations();
    updateTeacherPenUi();
    queueTeacherAnnotationBroadcast(broadcastReason, true);
}

function createTeacherStroke() {
    const baseSize = clampTeacherBrushSize(teacherBrushSize);
    const isEraser = teacherActiveTool === TEACHER_TOOL_TYPES.ERASER;

    return {
        id: createTeacherAnnotationId(),
        color: isEraser ? '#000000' : teacherPenColour,
        width: baseSize,
        erase: isEraser,
        opacity: 1,
        composite: isEraser ? 'destination-out' : 'source-over',
        tool: teacherActiveTool,
        points: []
    };
}

function getTeacherBrushPreviewSize(value) {
    const brushSize = clampTeacherBrushSize(value);
    const range = TEACHER_MAX_BRUSH_SIZE - TEACHER_MIN_BRUSH_SIZE;
    if (range <= 0) {
        return 16;
    }
    return Math.round(((brushSize - TEACHER_MIN_BRUSH_SIZE) / range) * 28 + 10);
}

function getTeacherBrushPreviewColour() {
    if (teacherActiveTool === TEACHER_TOOL_TYPES.ERASER) {
        return '#ffffff';
    }
    return teacherPenColour;
}

function getTeacherBrushPreviewOpacity() {
    return 1;
}

function clampTeacherBrushSize(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return TEACHER_DEFAULT_BRUSH_SIZE;
    }
    return clampNumber(value, TEACHER_MIN_BRUSH_SIZE, TEACHER_MAX_BRUSH_SIZE);
}

function formatTeacherBrushSize(value) {
    return clampTeacherBrushSize(value).toFixed(1);
}

function readTeacherBrushSize() {
    try {
        const stored = localStorage.getItem(TEACHER_BRUSH_STORAGE_KEY);
        if (stored === null || stored === undefined) {
            return TEACHER_DEFAULT_BRUSH_SIZE;
        }
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
            return clampTeacherBrushSize(parsed);
        }
    } catch (_error) {
        // Ignore storage read errors
    }
    return TEACHER_DEFAULT_BRUSH_SIZE;
}

function writeTeacherBrushSize(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return;
    }

    try {
        localStorage.setItem(TEACHER_BRUSH_STORAGE_KEY, String(value));
    } catch (_error) {
        // Ignore storage write errors (e.g., private browsing)
    }
}

function readTeacherStylusPreference() {
    try {
        const stored = localStorage.getItem(TEACHER_STYLUS_STORAGE_KEY);
        if (stored === 'true') {
            return true;
        }
        if (stored === 'false') {
            return false;
        }
    } catch (_error) {
        // Ignore storage read errors
    }

    return true;
}

function writeTeacherStylusPreference(value) {
    try {
        localStorage.setItem(TEACHER_STYLUS_STORAGE_KEY, value ? 'true' : 'false');
    } catch (_error) {
        // Ignore storage write errors
    }
}

function setTeacherStylusOnly(active, options = {}) {
    const { persist = true, silent = false } = options || {};
    teacherStylusOnly = Boolean(active);

    if (persist) {
        writeTeacherStylusPreference(teacherStylusOnly);
    }

    if (!silent) {
        updateTeacherPenUi();
    }
}

function getTeacherStylusModeLabel() {
    return teacherStylusOnly
        ? 'Stylus mode (pen only)'
        : 'Stylus mode (all inputs)';
}

function clearTeacherPenAnnotations() {
    const student = ensureTeacherPenCollections(teacherPenStudent);
    if (!student || student.teacherAnnotations.length === 0) {
        return;
    }

    recordTeacherHistory(student, { type: 'clear', paths: student.teacherAnnotations });
    student.teacherAnnotations = [];
    renderTeacherAnnotations();
    updateTeacherPenUi();
    queueTeacherAnnotationBroadcast('clear', true);
}

function renderTeacherAnnotations() {
    if (!teacherOverlayCtx || !teacherOverlayCanvas) {
        return;
    }

    resetTeacherStrokeDrawState();
    teacherOverlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    teacherOverlayCtx.clearRect(0, 0, teacherOverlayCanvas.width, teacherOverlayCanvas.height);

    if (!teacherPenStudent || !Array.isArray(teacherPenStudent.teacherAnnotations)) {
        return;
    }

    teacherPenStudent.teacherAnnotations.forEach((path) => {
        drawSmoothStudentPath(teacherOverlayCtx, path);
    });

    if (teacherPenStudent) {
        drawStudentCanvas(teacherPenStudent);
    }
}

function queueTeacherAnnotationBroadcast(reason = 'update', immediate = false) {
    if (!teacherPenStudent) {
        return;
    }

    if (immediate) {
        flushTeacherAnnotationBroadcast(reason);
        return;
    }

    teacherAnnotationBroadcastPendingStudent = teacherPenStudent;
    teacherAnnotationBroadcastReason = reason || 'update';

    if (teacherAnnotationBroadcastTimer) {
        return;
    }

    const scheduleTimeout = typeof window !== 'undefined' && window.setTimeout
        ? window.setTimeout.bind(window)
        : setTimeout;

    teacherAnnotationBroadcastTimer = scheduleTimeout(() => {
        const target = teacherAnnotationBroadcastPendingStudent;
        const sendReason = teacherAnnotationBroadcastReason;
        teacherAnnotationBroadcastTimer = null;
        teacherAnnotationBroadcastPendingStudent = null;
        teacherAnnotationBroadcastReason = 'update';
        if (target) {
            sendTeacherAnnotationsToStudent(target, sendReason);
        }
    }, 80);
}

function flushTeacherAnnotationBroadcast(reason = 'update') {
    if (teacherAnnotationBroadcastTimer) {
        clearTimeout(teacherAnnotationBroadcastTimer);
        teacherAnnotationBroadcastTimer = null;
    }

    teacherAnnotationBroadcastPendingStudent = null;
    const target = teacherPenStudent;
    teacherAnnotationBroadcastReason = 'update';

    if (target) {
        sendTeacherAnnotationsToStudent(target, reason);
    }
}

function sendTeacherAnnotationsToStudent(student, reason = 'update') {
    if (!student || !student.username) {
        return;
    }

    const streamState = ensureTeacherAnnotationStreamState(student);
    const annotationsSource = Array.isArray(student.teacherAnnotations)
        ? student.teacherAnnotations
        : [];

    let annotationsPayload = null;
    let deltaPayload = null;

    if (reason === 'clear') {
        resetTeacherAnnotationStream(streamState);
        annotationsPayload = [];
        deltaPayload = { type: 'clear' };
    } else if (reason === 'sync') {
        const serialised = serialiseTeacherAnnotations(annotationsSource);
        annotationsPayload = serialised;
        deltaPayload = {
            type: 'replace',
            annotations: serialised
        };
        updateTeacherAnnotationStreamSnapshot(streamState, annotationsSource);
    } else {
        const delta = buildTeacherAnnotationDelta(student, streamState);
        if (!delta) {
            return;
        }

        if (delta.fullSync) {
            const serialised = serialiseTeacherAnnotations(annotationsSource);
            annotationsPayload = serialised;
            deltaPayload = {
                type: 'replace',
                annotations: serialised
            };
            updateTeacherAnnotationStreamSnapshot(streamState, annotationsSource);
        } else {
            deltaPayload = {
                type: 'operations',
                size: {
                    width: streamState?.width || BASE_CANVAS_WIDTH,
                    height: streamState?.height || BASE_CANVAS_HEIGHT
                },
                operations: delta.operations
            };
            updateTeacherAnnotationStreamSnapshot(streamState, annotationsSource);
        }
    }

    const hasAnnotations = annotationsSource.length > 0;
    if (hasAnnotations) {
        markStudentReviewed(student);
    }

    const reviewed = Boolean(student.teacherHasReviewed || hasAnnotations);

    const payload = {
        target: student.username,
        reason: reason || 'update',
        reviewed
    };

    if (annotationsPayload !== null) {
        payload.annotations = annotationsPayload;
    }

    if (deltaPayload) {
        payload.delta = deltaPayload;
    }

    safeSend('teacher_annotations', payload);
}

function attachTeacherPenToStudent(student) {
    completeTeacherEraserAction({ cancel: true });
    teacherPenStudent = student || null;
    teacherPenDrawing = false;
    teacherPenCurrentPath = null;

    if (!teacherPenStudent) {
        setTeacherPenActive(false);
        renderTeacherAnnotations();
        updateTeacherPenUi();
        return;
    }

    const target = ensureTeacherPenCollections(teacherPenStudent);
    hydrateTeacherHistoryFromAnnotations(target);

    setTeacherPenActive(true);
    renderTeacherAnnotations();
    updateTeacherPenUi();
    queueTeacherAnnotationBroadcast('sync', true);
}

function detachTeacherPenFromStudent() {
    completeTeacherEraserAction({ cancel: true });
    teacherPenDrawing = false;
    teacherPenCurrentPath = null;
    teacherPenStudent = null;
    if (teacherAnnotationBroadcastTimer) {
        clearTimeout(teacherAnnotationBroadcastTimer);
        teacherAnnotationBroadcastTimer = null;
    }
    teacherAnnotationBroadcastPendingStudent = null;
    teacherAnnotationBroadcastReason = 'update';
    setTeacherPenActive(false);
    renderTeacherAnnotations();
    updateTeacherPenUi();
}

function beginTeacherStrokeDraw(stroke) {
    teacherStrokeDrawState.stroke = stroke || null;
    teacherStrokeDrawState.buffer = [];
    teacherStrokeDrawState.history = [];
    if (teacherStrokeDrawState.rafId !== null) {
        cancelAnimationFrame(teacherStrokeDrawState.rafId);
        teacherStrokeDrawState.rafId = null;
    }
}

function addTeacherStrokePointForDrawing(point) {
    if (!teacherStrokeDrawState.stroke) {
        return;
    }

    teacherStrokeDrawState.buffer.push(point);
    teacherStrokeDrawState.history.push(point);
    queueTeacherStrokeDraw();
}

function queueTeacherStrokeDraw(flush = false) {
    if (flush) {
        if (teacherStrokeDrawState.rafId !== null) {
            cancelAnimationFrame(teacherStrokeDrawState.rafId);
            teacherStrokeDrawState.rafId = null;
        }
        drawTeacherStroke(true);
        return;
    }

    if (teacherStrokeDrawState.rafId !== null) {
        return;
    }

    teacherStrokeDrawState.rafId = requestAnimationFrame(() => {
        teacherStrokeDrawState.rafId = null;
        drawTeacherStroke();
    });
}

function drawTeacherStroke(flush = false) {
    if (!teacherOverlayCtx || !teacherStrokeDrawState.stroke) {
        teacherStrokeDrawState.buffer = [];
        return;
    }

    const points = teacherStrokeDrawState.buffer;
    if (!Array.isArray(points) || points.length === 0) {
        teacherStrokeDrawState.buffer = [];
        return;
    }

    const stroke = teacherStrokeDrawState.stroke;
    const baseWidth = typeof stroke.width === 'number' && stroke.width > 0
        ? stroke.width
        : TEACHER_MIN_BRUSH_SIZE;
    const strokeColor = stroke.erase ? '#000000' : (stroke.color || teacherPenColour);
    const opacity = typeof stroke.opacity === 'number' && Number.isFinite(stroke.opacity)
        ? clampNumber(stroke.opacity, 0.05, 1)
        : 1;

    teacherOverlayCtx.save();
    teacherOverlayCtx.globalCompositeOperation = stroke.erase
        ? 'destination-out'
        : (stroke.composite || 'source-over');
    teacherOverlayCtx.globalAlpha = opacity;
    teacherOverlayCtx.strokeStyle = strokeColor;
    teacherOverlayCtx.lineCap = 'round';
    teacherOverlayCtx.lineJoin = 'round';

    if (points.length === 1) {
        drawTeacherDot(teacherOverlayCtx, points[0], stroke, baseWidth);
        teacherOverlayCtx.restore();
        teacherStrokeDrawState.buffer = flush ? [] : points.slice(-1);
        return;
    }

    teacherOverlayCtx.beginPath();
    let previous = points[0];
    teacherOverlayCtx.moveTo(previous.x, previous.y);

    for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        const midpoint = getStudentMidpoint(previous, current);
        teacherOverlayCtx.lineWidth = baseWidth;
        teacherOverlayCtx.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
        teacherOverlayCtx.stroke();
        previous = current;
    }

    teacherOverlayCtx.restore();
    teacherStrokeDrawState.buffer = flush ? [] : points.slice(-2);
    if (flush) {
        teacherStrokeDrawState.history = [];
    }
}

function drawTeacherDot(ctx, point, stroke, baseWidth) {
    if (!ctx || !point) {
        return;
    }

    const radius = Math.max(baseWidth * 0.5, baseWidth * 0.35, 0.6);

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = stroke.erase ? '#000000' : (stroke.color || teacherPenColour);
    ctx.fill();
}

function resetTeacherStrokeDrawState() {
    if (teacherStrokeDrawState.rafId !== null) {
        cancelAnimationFrame(teacherStrokeDrawState.rafId);
        teacherStrokeDrawState.rafId = null;
    }
    teacherStrokeDrawState.buffer = [];
    teacherStrokeDrawState.history = [];
    teacherStrokeDrawState.stroke = null;
}

function handleTeacherPenPointerDown(event) {
    if (!teacherPenActive || !teacherPenStudent || !teacherOverlayCanvas) {
        return;
    }

    if (teacherStylusOnly && typeof event.pointerType === 'string' && event.pointerType && event.pointerType !== 'pen') {
        return;
    }

    event.preventDefault();

    const student = ensureTeacherPenCollections(teacherPenStudent);

    if (teacherActiveTool !== TEACHER_TOOL_TYPES.ERASER) {
        completeTeacherEraserAction({ cancel: true });
    }

    if (teacherActiveTool === TEACHER_TOOL_TYPES.ERASER) {
        const point = getTeacherOverlayPoint(event);
        if (!point) {
            return;
        }

        teacherPenDrawing = true;
        teacherPenCurrentPath = null;

        const removal = eraseTeacherAnnotationsAtPoint(point.x, point.y);
        if (removal) {
            appendTeacherEraserRemoval(student, removal);
            renderTeacherAnnotations();
            updateTeacherPenUi();
            queueTeacherAnnotationBroadcast('update', true);
        }

        if (typeof event.pointerId === 'number') {
            teacherOverlayCanvas.setPointerCapture(event.pointerId);
        }
        return;
    }

    const path = createTeacherStroke();
    student.teacherAnnotations.push(path);
    recordTeacherHistory(student, { type: 'draw', path, index: student.teacherAnnotations.length - 1 });
    teacherPenCurrentPath = path;
    beginTeacherStrokeDraw(path);
    teacherPenDrawing = true;

    addTeacherPenPoint(event);

    if (typeof event.pointerId === 'number') {
        teacherOverlayCanvas.setPointerCapture(event.pointerId);
    }
}

function handleTeacherPenPointerMove(event) {
    if (!teacherPenDrawing) {
        return;
    }

    if (teacherActiveTool === TEACHER_TOOL_TYPES.ERASER) {
        event.preventDefault();
        const point = getTeacherOverlayPoint(event);
        if (!point) {
            return;
        }

        const removal = eraseTeacherAnnotationsAtPoint(point.x, point.y);
        if (removal) {
            appendTeacherEraserRemoval(teacherPenStudent, removal);
            renderTeacherAnnotations();
            updateTeacherPenUi();
            queueTeacherAnnotationBroadcast('update');
        }
        return;
    }

    event.preventDefault();
    addTeacherPenPoint(event);
}

function handleTeacherPenPointerUp(event) {
    if (!teacherPenDrawing) {
        return;
    }

    event.preventDefault();

    const isEraser = teacherActiveTool === TEACHER_TOOL_TYPES.ERASER;

    if (isEraser) {
        teacherPenDrawing = false;
        teacherPenCurrentPath = null;

        if (teacherOverlayCanvas && typeof event.pointerId === 'number') {
            try {
                teacherOverlayCanvas.releasePointerCapture(event.pointerId);
            } catch (_error) {
                // Ignore release errors if capture wasn't set.
            }
        }

        completeTeacherEraserAction();
        updateTeacherPenUi();
        queueTeacherAnnotationBroadcast('update', true);
        return;
    }

    completeTeacherEraserAction({ cancel: true });
    addTeacherPenPoint(event);
    queueTeacherStrokeDraw(true);

    const completedPath = teacherPenCurrentPath;

    teacherPenDrawing = false;
    teacherPenCurrentPath = null;

    if (completedPath && Array.isArray(completedPath.points) && completedPath.points.length === 0) {
        const student = ensureTeacherPenCollections(teacherPenStudent);
        if (student.teacherAnnotations.length > 0) {
            student.teacherAnnotations.pop();
        }
        if (Array.isArray(student.teacherHistory) && student.teacherHistory.length > 0) {
            student.teacherHistory.pop();
        }
    }

    renderTeacherAnnotations();
    resetTeacherStrokeDrawState();

    if (teacherOverlayCanvas && typeof event.pointerId === 'number') {
        try {
            teacherOverlayCanvas.releasePointerCapture(event.pointerId);
        } catch (_error) {
            // Ignore release errors if capture wasn't set.
        }
    }

    updateTeacherPenUi();
    queueTeacherAnnotationBroadcast('update', true);
}

function addTeacherPenPoint(event) {
    if (!teacherPenCurrentPath || !teacherOverlayCanvas) {
        return;
    }

    const point = getTeacherOverlayPoint(event);
    if (!point) {
        return;
    }

    teacherPenCurrentPath.points.push({ x: point.x, y: point.y, p: 1 });
    addTeacherStrokePointForDrawing({ x: point.x, y: point.y });

    if (teacherPenStudent) {
        markStudentReviewed(teacherPenStudent);
    }

    queueTeacherAnnotationBroadcast('update');
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
                selectPreset(presetId);
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
        if (preset?.previewAlt) {
            image.alt = preset.previewAlt;
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

    attachTeacherPenToStudent(student);

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

    detachTeacherPenFromStudent();

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
    const paddingLeft = parseFloat(styles.paddingLeft || '0');
    const paddingRight = parseFloat(styles.paddingRight || '0');
    const paddingTop = parseFloat(styles.paddingTop || '0');
    const paddingBottom = parseFloat(styles.paddingBottom || '0');

    const availableWidth = Math.max(0, width - paddingLeft - paddingRight);
    const availableHeight = Math.max(0, height - paddingTop - paddingBottom);
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

    if (teacherOverlayCanvas) {
        const { width: overlayWidth, height: overlayHeight, left, top } = calculateOverlayPlacement({
            containerWidth: width,
            containerHeight: height,
            paddingLeft,
            paddingRight,
            paddingTop,
            paddingBottom,
            drawWidth,
            drawHeight
        });

        teacherOverlayCanvas.style.width = `${overlayWidth}px`;
        teacherOverlayCanvas.style.height = `${overlayHeight}px`;
        teacherOverlayCanvas.style.left = `${left}px`;
        teacherOverlayCanvas.style.top = `${top}px`;
    }

}

function updateStudentModalMeta(student) {
    if (!studentModalSubtitle) {
        return;
    }

    if (!student) {
        studentModalSubtitle.textContent = '';
        return;
    }

    const parts = [];
    const activityText = student.updatedAt?.textContent || '';
    if (activityText) {
        parts.push(activityText);
    }
    if (student.teacherHasReviewed) {
        parts.push('Reviewed by you');
    }
    studentModalSubtitle.textContent = parts.join(' • ');
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
    if (!channelReady || !channel || typeof event !== 'string' || event.length === 0) {
        return;
    }

    const clonedPayload = clonePayload(payload);

    if (sendQueue.length >= SEND_QUEUE_LIMIT) {
        sendQueue.shift();
    }

    sendQueue.push({ event, payload: clonedPayload });
    drainSendQueue();
}

function drainSendQueue() {
    if (!channelReady || !channel) {
        sendInFlight = false;
        return;
    }

    if (sendInFlight || sendQueue.length === 0) {
        return;
    }

    const next = sendQueue.shift();
    if (!next) {
        return;
    }

    sendInFlight = true;
    channel.send({ type: 'broadcast', event: next.event, payload: next.payload }).then(({ error }) => {
        if (error) {
            console.error(`Supabase event "${next.event}" failed`, error);
        }
    }).catch((error) => {
        console.error(`Supabase event "${next.event}" threw`, error);
    }).finally(() => {
        sendInFlight = false;
        if (sendQueue.length > 0) {
            drainSendQueue();
        }
    });
}

function clearSendQueue() {
    sendQueue.length = 0;
    sendInFlight = false;
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

function setupQuestionControls() {
    if (!startQuestionBtn || !modeStatus) {
        return;
    }

    if (Array.isArray(modeChoiceButtons) && modeChoiceButtons.length > 0) {
        modeChoiceButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.modeChoice;
                if (mode) {
                    setSelectedMode(mode);
                }
            });
        });
    }

    setSelectedMode(selectedMode);
    renderPresetSummary();

    if (referenceInput) {
        referenceInput.addEventListener('change', handleReferenceSelection);
    }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', () => {
            clearReferenceImage(false);
        });
    }

    startQuestionBtn.addEventListener('click', handleStartQuestion);

    refreshModeStatus();
    updateStartButtonState();
}

function setSelectedMode(mode) {
    const validModes = ['whiteboard', 'upload', 'preset'];
    const resolvedMode = validModes.includes(mode) ? mode : 'whiteboard';
    selectedMode = resolvedMode;

    if (Array.isArray(modeChoiceButtons)) {
        modeChoiceButtons.forEach((button) => {
            if (!button) {
                return;
            }
            const isActive = button.dataset.modeChoice === resolvedMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
    }

    if (Array.isArray(modePanels)) {
        modePanels.forEach((panel) => {
            if (!panel) {
                return;
            }
            const isActive = panel.dataset.modePanel === resolvedMode;
            panel.classList.toggle('is-active', isActive);
            if (isActive) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        });
    }

    refreshModeStatus();
    updateStartButtonState();
}

function setModeStatus(message) {
    if (modeStatus) {
        modeStatus.textContent = message;
    }
}

function getSelectedModeLabel() {
    if (selectedMode === 'upload') {
        return selectedImageName
            ? `photo of “${selectedImageName}”`
            : 'photo reference';
    }

    if (selectedMode === 'preset') {
        const preset = getPresetById(activePresetId);
        if (preset) {
            return `${preset.label} template`;
        }
        return 'template';
    }

    return 'blank whiteboard';
}

function canSendQuestion() {
    if (selectedMode === 'upload') {
        return Boolean(selectedImageData);
    }

    if (selectedMode === 'preset') {
        return Boolean(activePresetId);
    }

    return true;
}

function updateStartButtonState() {
    if (!startQuestionBtn) {
        return;
    }

    const nextNumber = sessionState.questionNumber + 1;
    const isConnected = Boolean(channelReady);
    const canSend = canSendQuestion();

    if (startQuestionLabel) {
        startQuestionLabel.textContent = isConnected ? 'Send question' : 'Connecting…';
    }

    if (startQuestionNumber) {
        if (isConnected) {
            startQuestionNumber.textContent = `#${nextNumber}`;
            startQuestionNumber.hidden = false;
        } else {
            startQuestionNumber.textContent = '';
            startQuestionNumber.hidden = true;
        }
    }

    startQuestionBtn.disabled = !isConnected || !canSend;
}

function refreshModeStatus() {
    if (!modeStatus) {
        return;
    }

    if (!channelReady) {
        setModeStatus('Connecting to Supabase…');
        return;
    }

    if (!canSendQuestion()) {
        if (selectedMode === 'upload') {
            setModeStatus('Choose a photo before sending your question.');
            return;
        }

        if (selectedMode === 'preset') {
            setModeStatus('Select a template to continue.');
            return;
        }
    }

    const label = getSelectedModeLabel();
    const nextNumber = sessionState.questionNumber + 1;
    setModeStatus(`Ready to send question #${nextNumber} with a ${label}.`);
}

function handleReferenceSelection(event) {
    const files = event?.target?.files;
    if (!files || files.length === 0) {
        return;
    }

    const [file] = files;
    if (!file || !file.type.startsWith('image/')) {
        setModeStatus('Please choose a supported image file.');
        if (referenceInput) {
            referenceInput.value = '';
        }
        return;
    }

    selectedImageName = file.name || '';

    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result !== 'string') {
            setModeStatus('We could not read that file. Please try another image.');
            return;
        }

        selectedImageData = reader.result;
        setSelectedMode('upload');
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
                ? `Selected photo: ${selectedImageName}`
                : 'Photo ready to send';
        }

        if (clearImageBtn) {
            clearImageBtn.hidden = false;
        }

        refreshModeStatus();
        updateStartButtonState();
    };
    reader.onerror = () => {
        setModeStatus('We could not read that file. Please try another image.');
    };
    reader.readAsDataURL(file);
}

function clearReferenceImage(resetActive = false) {
    selectedImageData = null;
    selectedImageName = '';

    if (resetActive) {
        activeBackgroundImage = null;
        activeBackgroundVectors = null;
        recordBackgroundChange(null, { name: 'Whiteboard' });
    }

    activePresetId = null;
    updateModeSelections();
    renderPresetSummary();

    if (referenceInput) {
        referenceInput.value = '';
    }

    updateReferencePreview(null);

    if (referenceFileName) {
        referenceFileName.textContent = 'No photo selected';
    }

    if (clearImageBtn) {
        clearImageBtn.hidden = true;
    }

    refreshModeStatus();
    updateStartButtonState();
}

function updateReferencePreview(imageData, altText = 'Selected reference preview') {
    if (!referencePreview || !referencePreviewImage) {
        return;
    }

    if (!imageData) {
        referencePreviewImage.removeAttribute('src');
        referencePreviewImage.alt = '';
        referencePreviewImage.hidden = true;
        if (referencePreview) {
            referencePreview.classList.remove('has-image');
        }
        if (referencePreviewPlaceholder) {
            referencePreviewPlaceholder.hidden = false;
        }
        return;
    }

    if (referencePreview) {
        referencePreview.classList.add('has-image');
    }
    referencePreviewImage.hidden = false;
    referencePreviewImage.src = imageData;
    referencePreviewImage.alt = altText;
    if (referencePreviewPlaceholder) {
        referencePreviewPlaceholder.hidden = true;
    }
}

function renderPresetSummary() {
    if (!presetSummary) {
        return;
    }

    presetSummary.innerHTML = '';
    const preset = getPresetById(activePresetId);
    if (!preset) {
        const empty = document.createElement('p');
        empty.className = 'mode-panel__empty';
        empty.textContent = 'No template chosen yet.';
        presetSummary.appendChild(empty);
        return;
    }

    const art = document.createElement('div');
    art.className = 'mode-panel__preset-art';
    if (preset.imageData) {
        const artImage = document.createElement('img');
        artImage.src = preset.imageData;
        artImage.alt = preset.previewAlt || `${preset.label} template preview`;
        artImage.loading = 'lazy';
        art.appendChild(artImage);
    } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'mode-panel__preset-placeholder';
        placeholder.textContent = 'Preview unavailable';
        art.appendChild(placeholder);
    }

    const meta = document.createElement('div');
    meta.className = 'mode-panel__preset-meta';
    const title = document.createElement('strong');
    title.textContent = preset.label;
    const description = document.createElement('span');
    description.textContent = preset.description || 'Template';
    meta.appendChild(title);
    meta.appendChild(description);

    presetSummary.appendChild(art);
    presetSummary.appendChild(meta);
}

function selectPreset(presetId) {
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

    if (referenceFileName) {
        referenceFileName.textContent = 'No photo selected';
    }

    if (clearImageBtn) {
        clearImageBtn.hidden = true;
    }

    updateReferencePreview(preset.imageData, preset.previewAlt || 'Selected template preview');
    renderPresetSummary();
    updateModeSelections();
    setSelectedMode('preset');
    refreshModeStatus();
    updateStartButtonState();
    closeModeModal();
}

function buildQuestionPayload() {
    const payload = {
        mode: {
            type: selectedMode,
            label: 'Whiteboard',
            description: 'Blank canvas'
        },
        background: {
            imageData: null,
            vector: null,
            presetId: null,
            fileName: null
        }
    };

    if (selectedMode === 'upload' && selectedImageData) {
        payload.mode.label = selectedImageName ? `Photo: ${selectedImageName}` : 'Photo reference';
        payload.mode.description = 'Uploaded image';
        payload.background.imageData = selectedImageData;
        payload.background.fileName = selectedImageName || null;
    } else if (selectedMode === 'preset') {
        const preset = getPresetById(activePresetId);
        if (preset) {
            payload.mode.label = preset.label;
            payload.mode.description = preset.description || 'Template';
            payload.background.imageData = preset.imageData || null;
            payload.background.vector = cloneBackgroundVectorDefinition(preset.vector);
            payload.background.presetId = preset.id || null;
            payload.background.fileName = preset.label || null;
        }
    }

    return payload;
}

function handleStartQuestion() {
    if (!channelReady) {
        refreshModeStatus();
        return;
    }

    if (!canSendQuestion()) {
        refreshModeStatus();
        return;
    }

    if (typeof window !== 'undefined' && sessionState.isQuestionActive) {
        const confirmReset = window.confirm('Start the next question and clear every student canvas?');
        if (!confirmReset) {
            return;
        }
    }

    const payload = buildQuestionPayload();
    const { mode, background } = payload;

    activeBackgroundImage = background.imageData || null;
    activeBackgroundVectors = background.vector ? cloneBackgroundVectorDefinition(background.vector) : null;
    recordBackgroundChange(activeBackgroundImage, { name: background.fileName || mode.label });

    advanceQuestionState(mode);

    sendReliableBroadcast('next_question', {
        initiatedAt: Date.now(),
        questionNumber: sessionState.questionNumber,
        mode,
        background
    });

    clearAllStudentCanvases(background);
    setModeStatus(`${mode.label} sent to your students.`);
    updateStartButtonState();
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

function clearAllStudentCanvases(background = null) {
    const backgroundImage = background?.imageData || null;
    const backgroundVector = background?.vector ? cloneBackgroundVectorDefinition(background.vector) : null;

    students.forEach((student, username) => {
        student.paths = [];

        if (backgroundImage) {
            student.backgroundImageData = backgroundImage;
            const image = new Image();
            image.onload = () => {
                if (student.backgroundImageElement === image) {
                    drawStudentCanvas(student);
                }
            };
            image.src = backgroundImage;
            student.backgroundImageElement = image;
        } else {
            student.backgroundImageData = null;
            student.backgroundImageElement = null;
        }

        student.backgroundVectors = backgroundVector ? cloneBackgroundVectorDefinition(backgroundVector) : null;
        student.teacherAnnotations = [];
        student.teacherHistory = [];
        student.teacherRedoStack = [];
        student.teacherAnnotationStream = null;

        clearStudentReview(student);

        drawStudentCanvas(student);
        student.updatedAt.textContent = 'Awaiting activity';
        setStudentSyncState(username, true);
        if (activeModalStudent === username) {
            updateStudentModalMeta(student);
        }
        sendTeacherAnnotationsToStudent(student, 'clear');
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

        const composite = typeof data.composite === 'string' && data.composite.trim().length > 0
            ? data.composite
            : (data.erase ? 'destination-out' : 'source-over');
        const opacity = typeof data.opacity === 'number' && Number.isFinite(data.opacity)
            ? clampNumber(data.opacity, 0.05, 1)
            : 1;
        const strokeWidth = typeof data.width === 'number' && Number.isFinite(data.width)
            ? Math.max(0.5, data.width)
            : TEACHER_MIN_BRUSH_SIZE;
        const strokeColor = typeof data.color === 'string' && data.color.trim().length > 0
            ? data.color
            : '#111827';

        if (data.type === 'line') {
            ctx.save();
            ctx.globalCompositeOperation = composite;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(data.startX, data.startY);
            ctx.lineTo(data.endX, data.endY);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();
        } else if (data.type === 'dot') {
            ctx.save();
            ctx.globalCompositeOperation = composite;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            const radius = typeof data.radius === 'number' && Number.isFinite(data.radius)
                ? Math.max(0.5, data.radius)
                : Math.max(strokeWidth * 0.5, strokeWidth * 0.35);
            ctx.arc(data.x, data.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
            ctx.restore();
        } else if (data.type === 'quadratic') {
            ctx.save();
            ctx.globalCompositeOperation = composite;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(data.startX, data.startY);
            ctx.quadraticCurveTo(data.controlX, data.controlY, data.endX, data.endY);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();
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
            if (ctx !== student.previewCtx) {
                renderTeacherOverlay(ctx, student.teacherAnnotations);
            }
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

function renderTeacherOverlay(ctx, annotations) {
    if (!ctx || !Array.isArray(annotations) || annotations.length === 0) {
        return;
    }

    ctx.save();
    annotations.forEach((path) => {
        if (path) {
            drawSmoothStudentPath(ctx, path);
        }
    });
    ctx.restore();
}

function drawSmoothStudentPath(ctx, path) {
    if (!path || !Array.isArray(path.points) || path.points.length === 0) {
        return;
    }

    const points = normaliseStudentPoints(path.points);
    if (points.length === 0) {
        return;
    }

    const baseWidth = typeof path.width === 'number' && path.width > 0 ? path.width : TEACHER_MIN_BRUSH_SIZE;
    const erase = Boolean(path.erase);
    const strokeColor = erase ? '#000000' : (typeof path.color === 'string' ? path.color : '#111827');
    const opacity = typeof path.opacity === 'number' && Number.isFinite(path.opacity)
        ? clampNumber(path.opacity, 0.05, 1)
        : 1;
    const composite = erase
        ? 'destination-out'
        : (typeof path.composite === 'string' && path.composite.trim().length > 0
            ? path.composite
            : 'source-over');

    ctx.save();
    ctx.globalCompositeOperation = composite;
    ctx.globalAlpha = opacity;

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

function resetTeacherAnnotationStream(streamState) {
    if (!streamState) {
        return;
    }

    if (streamState.paths instanceof Map) {
        streamState.paths.clear();
    } else {
        streamState.paths = new Map();
    }

    streamState.order = [];
    streamState.width = teacherOverlayCanvas?.width || BASE_CANVAS_WIDTH;
    streamState.height = teacherOverlayCanvas?.height || BASE_CANVAS_HEIGHT;
}

function updateTeacherAnnotationStreamSnapshot(streamState, annotations) {
    if (!streamState) {
        return;
    }

    const source = Array.isArray(annotations) ? annotations : [];
    const map = streamState.paths instanceof Map ? streamState.paths : new Map();
    const seen = new Set();
    const order = [];

    source.forEach((path, index) => {
        if (!path || !Array.isArray(path.points) || path.points.length === 0) {
            return;
        }

        const id = ensureTeacherPathId(path);
        const pointsLength = path.points.length;
        map.set(id, {
            index,
            points: pointsLength
        });
        seen.add(id);
        order.push(id);
    });

    Array.from(map.keys()).forEach((id) => {
        if (!seen.has(id)) {
            map.delete(id);
        }
    });

    streamState.paths = map;
    streamState.order = order;
    streamState.width = teacherOverlayCanvas?.width || BASE_CANVAS_WIDTH;
    streamState.height = teacherOverlayCanvas?.height || BASE_CANVAS_HEIGHT;
}

function serialiseTeacherPoints(points) {
    if (!Array.isArray(points)) {
        return [];
    }

    const width = teacherOverlayCanvas?.width || BASE_CANVAS_WIDTH;
    const height = teacherOverlayCanvas?.height || BASE_CANVAS_HEIGHT;

    return points.map((point) => {
        const x = typeof point?.x === 'number' ? point.x : Array.isArray(point) ? Number(point[0]) : 0;
        const y = typeof point?.y === 'number' ? point.y : Array.isArray(point) ? Number(point[1]) : 0;
        const p = typeof point?.p === 'number' ? point.p : (Array.isArray(point) && typeof point[2] === 'number' ? point[2] : 1);

        const normalisedX = Math.min(1, Math.max(0, x / width));
        const normalisedY = Math.min(1, Math.max(0, y / height));
        const normalisedP = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 1));

        const precisionX = Math.round(normalisedX * 10000) / 10000;
        const precisionY = Math.round(normalisedY * 10000) / 10000;
        const precisionP = Math.round(normalisedP * 1000) / 1000;

        return [precisionX, precisionY, precisionP];
    });
}

function serialiseTeacherPath(path) {
    if (!path || !Array.isArray(path.points) || path.points.length === 0) {
        return null;
    }

    const id = ensureTeacherPathId(path);
    const color = typeof path.color === 'string' && path.color.trim().length > 0 ? path.color : teacherPenColour;
    const width = typeof path.width === 'number' && Number.isFinite(path.width)
        ? clampNumber(path.width, TEACHER_MIN_BRUSH_SIZE, TEACHER_MAX_STROKE_WIDTH)
        : clampTeacherBrushSize(teacherBrushSize);
    const erase = Boolean(path.erase);
    const opacity = typeof path.opacity === 'number' && Number.isFinite(path.opacity)
        ? clampNumber(path.opacity, 0, 1)
        : 1;
    const composite = typeof path.composite === 'string' && path.composite.trim().length > 0
        ? path.composite
        : (erase ? 'destination-out' : 'source-over');

    return {
        id,
        color,
        width,
        erase,
        opacity,
        composite,
        points: serialiseTeacherPoints(path.points)
    };
}

function serialiseTeacherAnnotations(annotations) {
    if (!Array.isArray(annotations)) {
        return [];
    }

    return annotations
        .map((path) => serialiseTeacherPath(path))
        .filter(Boolean);
}

function buildTeacherAnnotationDelta(student, streamState) {
    if (!student || !streamState) {
        return null;
    }

    const annotations = Array.isArray(student.teacherAnnotations)
        ? student.teacherAnnotations
        : [];

    if (!(streamState.paths instanceof Map)) {
        streamState.paths = new Map();
    }

    const knownOrder = Array.isArray(streamState.order) ? [...streamState.order] : [];
    const knownMap = streamState.paths;
    const currentIds = [];
    const operations = [];
    let requiresFullSync = false;

    const removalIds = knownOrder.filter((id) => !annotations.some((path) => ensureTeacherPathId(path) === id));

    removalIds.forEach((id) => {
        const stored = knownMap.get(id);
        const index = typeof stored?.index === 'number' ? stored.index : knownOrder.indexOf(id);
        operations.push({
            type: 'remove_path',
            id,
            index: index >= 0 ? index : 0
        });
        knownMap.delete(id);
    });

    annotations.forEach((path, index) => {
        if (!path || !Array.isArray(path.points) || path.points.length === 0) {
            return;
        }

        const id = ensureTeacherPathId(path);
        currentIds.push(id);
        const stored = knownMap.get(id);

        if (!stored) {
            const serialisedPath = serialiseTeacherPath(path);
            if (serialisedPath) {
                operations.push({
                    type: 'add_path',
                    index,
                    path: serialisedPath
                });
                knownMap.set(id, {
                    index,
                    points: path.points.length
                });
            }
            return;
        }

        if (stored.points > path.points.length) {
            requiresFullSync = true;
            return;
        }

        if (path.points.length > stored.points) {
            const newPoints = path.points.slice(stored.points);
            if (newPoints.length > 0) {
                operations.push({
                    type: 'append_points',
                    id,
                    points: serialiseTeacherPoints(newPoints)
                });
                stored.points = path.points.length;
            }
        }

        stored.index = index;
    });

    streamState.order = currentIds;

    if (requiresFullSync) {
        return { fullSync: true };
    }

    if (operations.length === 0) {
        return null;
    }

    return { fullSync: false, operations };
}

function cloneTeacherAnnotations(annotations) {
    if (!Array.isArray(annotations)) {
        return [];
    }

    return annotations.map((path) => {
        const points = Array.isArray(path?.points)
            ? path.points.map((point) => (Array.isArray(point) ? [...point] : { ...point }))
            : [];

        const id = ensureTeacherPathId(path);
        const color = typeof path?.color === 'string' && path.color.trim().length > 0
            ? path.color
            : teacherPenColour;
        const width = typeof path?.width === 'number' && Number.isFinite(path.width)
            ? clampNumber(path.width, TEACHER_MIN_BRUSH_SIZE, TEACHER_MAX_STROKE_WIDTH)
            : clampTeacherBrushSize(teacherBrushSize);
        const erase = Boolean(path?.erase);
        const opacity = typeof path?.opacity === 'number' && Number.isFinite(path.opacity)
            ? clampNumber(path.opacity, 0, 1)
            : 1;
        const tool = erase ? TEACHER_TOOL_TYPES.ERASER : TEACHER_TOOL_TYPES.PEN;
        const composite = erase ? 'destination-out' : 'source-over';

        return {
            id,
            color,
            width,
            erase,
            opacity,
            composite,
            tool,
            points
        };
    }).filter((path) => Array.isArray(path.points) && path.points.length > 0);
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
    const width = 800;
    const height = 600;
    const margin = 40;
    const spacing = 60;
    const elements = [
        {
            type: 'roundedRect',
            x: margin,
            y: margin,
            width: width - margin * 2,
            height: height - margin * 2,
            stroke: '#cbd5f5',
            strokeWidth: 4,
            fill: '#ffffff',
            radius: 18
        }
    ];

    const gridColor = '#e2e8f0';
    const gridStroke = 2;

    for (let y = margin + spacing; y < height - margin; y += spacing) {
        elements.push({
            type: 'line',
            x1: margin,
            y1: y,
            x2: width - margin,
            y2: y,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    }

    for (let x = margin + spacing; x < width - margin; x += spacing) {
        elements.push({
            type: 'line',
            x1: x,
            y1: margin,
            x2: x,
            y2: height - margin,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    }

    const axisStroke = '#1f2937';
    const axisWidth = 6;
    const headLength = 26;
    const headWidth = 18;

    elements.push({
        type: 'arrow',
        x1: margin,
        y1: height / 2,
        x2: width - margin,
        y2: height / 2,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    elements.push({
        type: 'arrow',
        x1: width / 2,
        y1: height - margin,
        x2: width / 2,
        y2: margin,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    return cloneBackgroundVectorDefinition({
        width,
        height,
        elements
    });
}

function createGraphCornerVectorData() {
    const width = 800;
    const height = 600;
    const margin = 40;
    const spacing = 60;
    const elements = [
        {
            type: 'roundedRect',
            x: margin,
            y: margin,
            width: width - margin * 2,
            height: height - margin * 2,
            stroke: '#cbd5f5',
            strokeWidth: 4,
            fill: '#ffffff',
            radius: 18
        }
    ];

    const gridColor = '#e2e8f0';
    const gridStroke = 2;

    for (let y = margin + spacing; y < height - margin; y += spacing) {
        elements.push({
            type: 'line',
            x1: margin,
            y1: y,
            x2: width - margin,
            y2: y,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    }

    for (let x = margin + spacing; x < width - margin; x += spacing) {
        elements.push({
            type: 'line',
            x1: x,
            y1: margin,
            x2: x,
            y2: height - margin,
            stroke: gridColor,
            strokeWidth: gridStroke
        });
    }

    const axisStroke = '#1f2937';
    const axisWidth = 6;
    const headLength = 26;
    const headWidth = 18;

    elements.push({
        type: 'arrow',
        x1: margin,
        y1: height - margin,
        x2: width - margin,
        y2: height - margin,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    elements.push({
        type: 'arrow',
        x1: margin,
        y1: height - margin,
        x2: margin,
        y2: margin,
        stroke: axisStroke,
        strokeWidth: axisWidth,
        cap: 'round',
        headLength,
        headWidth,
        fill: axisStroke
    });

    return cloneBackgroundVectorDefinition({
        width,
        height,
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
