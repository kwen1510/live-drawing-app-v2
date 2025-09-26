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
let preferredGridColumns = 3;
let activeModalStudent = null;
let modalReturnFocus = null;
const presenceKey = `teacher-${Math.random().toString(36).slice(2, 10)}`;
const students = new Map();
const GRID_STORAGE_KEY = 'teacher-grid-columns';

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
    setupClassroomControls();
    setupStudentGridControls();
    setupStudentModal();
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
                sendBackgroundToStudent(payload.username);
            }
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

    document.body.classList.add('modal-open');
    studentModal.removeAttribute('hidden');
    studentModal.classList.add('student-modal--open');
    studentModal.setAttribute('aria-hidden', 'false');

    if (studentModalTitle) {
        studentModalTitle.textContent = username;
    }

    updateStudentModalMeta(student);
    drawStudentCanvas(student);

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
    document.body.classList.remove('modal-open');

    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function' && document.contains(modalReturnFocus)) {
        modalReturnFocus.focus();
    }
    modalReturnFocus = null;
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
        updateReferencePreview(selectedImageData);

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

    safeSend('set_background', { imageData: selectedImageData });
    activeBackgroundImage = selectedImageData;
    updateReferenceStatus('Image sent to your students.');
    showPushFeedback('Sent!');
}

function clearReferenceImage(resetActive = false) {
    selectedImageData = null;
    selectedImageName = '';

    if (resetActive) {
        activeBackgroundImage = null;
    }

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

function updateReferencePreview(imageData) {
    if (!referencePreview || !referencePreviewImage) {
        return;
    }

    if (!imageData) {
        referencePreviewImage.removeAttribute('src');
        referencePreview.hidden = true;
        return;
    }

    referencePreview.hidden = false;
    referencePreviewImage.src = imageData;
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
    if (!activeBackgroundImage || !username) {
        return;
    }

    safeSend('set_background', {
        imageData: activeBackgroundImage,
        target: username
    });
}

function handleNextQuestion() {
    if (typeof window !== 'undefined') {
        const confirmReset = window.confirm('Clear every student canvas and move to the next question?');
        if (!confirmReset) {
            return;
        }
    }

    activeBackgroundImage = null;
    safeSend('next_question', { initiatedAt: Date.now() });
    clearAllStudentCanvases();
    updateReferenceStatus('Student canvases cleared. Share a new image when you\'re ready.');
}

function clearAllStudentCanvases() {
    students.forEach((student, username) => {
        student.backgroundImageData = null;
        student.backgroundImageElement = null;
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

    const resetTargets = () => {
        targets.forEach(({ ctx, canvas }) => {
            resetCanvas(ctx, canvas);
        });
    };

    const renderWithBackground = () => {
        targets.forEach(({ ctx }) => {
            drawStudentBackground(ctx, student.backgroundImageElement);
            renderStudentPaths(ctx, student.paths);
        });
    };

    const renderWithoutBackground = () => {
        targets.forEach(({ ctx }) => {
            renderStudentPaths(ctx, student.paths);
        });
    };

    resetTargets();

    if (student.backgroundImageElement) {
        if (student.backgroundImageElement.complete) {
            renderWithBackground();
        } else {
            student.backgroundImageElement.onload = () => {
                resetTargets();
                renderWithBackground();
                student.backgroundImageElement.onload = null;
            };
            student.backgroundImageElement.onerror = () => {
                resetTargets();
                renderWithoutBackground();
                student.backgroundImageElement.onload = null;
                student.backgroundImageElement.onerror = null;
            };
        }
        return;
    }

    renderWithoutBackground();
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
        const radius = Math.max(baseWidth * (point.p + 0.05), baseWidth * 0.35, baseWidth / 2, 0.5);
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
        const width = computeStudentSegmentWidth(previous.p, current.p, baseWidth);

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
    const finalWidth = computeStudentSegmentWidth(lastPoint.p, lastPoint.p, baseWidth);
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
            const [x, y, pressure] = point;
            if (typeof x === 'number' && typeof y === 'number') {
                accumulator.push({
                    x,
                    y,
                    p: typeof pressure === 'number' ? studentClamp(pressure, 0.05, 1) : 0.5
                });
            }
            return accumulator;
        }

        if (typeof point === 'object') {
            const { x, y } = point;
            if (typeof x === 'number' && typeof y === 'number') {
                const pressure = typeof point.p === 'number'
                    ? point.p
                    : (typeof point.pressure === 'number' ? point.pressure : 0.5);
                accumulator.push({
                    x,
                    y,
                    p: studentClamp(pressure, 0.05, 1)
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

function computeStudentSegmentWidth(pressureA, pressureB, baseWidth) {
    const base = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : 1.6;
    const average = ((pressureA || 0.5) + (pressureB || 0.5)) / 2;
    const minWidth = base * 0.35;
    const maxWidth = base * 1.6;
    const width = base * (average + 0.05);
    return studentClamp(width, Math.max(0.75, minWidth), Math.max(minWidth, maxWidth));
}

function studentClamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function drawStudentBackground(ctx, image) {
    const canvasRatio = BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT;
    const imageRatio = image.width / image.height;

    let drawWidth = BASE_CANVAS_WIDTH;
    let drawHeight = BASE_CANVAS_HEIGHT;

    if (imageRatio > canvasRatio) {
        drawWidth = BASE_CANVAS_WIDTH;
        drawHeight = BASE_CANVAS_WIDTH / imageRatio;
    } else {
        drawHeight = BASE_CANVAS_HEIGHT;
        drawWidth = BASE_CANVAS_HEIGHT * imageRatio;
    }

    const offsetX = (BASE_CANVAS_WIDTH - drawWidth) / 2;
    const offsetY = (BASE_CANVAS_HEIGHT - drawHeight) / 2;

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
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
