document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('snapshot-canvas');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const errorMessage = document.querySelector('.error-message');
    const photoCounter = document.getElementById('photo-counter');
    const flashOverlay = document.querySelector('.flash-overlay');
    const gallery = document.getElementById('gallery');

    const toggleBtn = document.getElementById('toggle-capture');
    const btnLabel = toggleBtn.querySelector('.btn-label');

    let photosTaken = 0;
    let detecting = false;
    let captureEnabled = false;
    let modelsLoaded = false;
    const COOLDOWN_MS = 3000;
    let lastCaptureTime = 0;

    // ---------- Botón toggle ----------
    toggleBtn.addEventListener('click', () => {
        captureEnabled = !captureEnabled;
        toggleBtn.classList.toggle('active', captureEnabled);
        btnLabel.textContent = captureEnabled ? 'Detener captura' : 'Iniciar captura';

        if (captureEnabled) {
            statusText.textContent = 'Cámara activa · Captura automática ON';
        } else {
            statusText.textContent = 'Cámara activa · Captura detenida';
        }
    });

    // ---------- Cámara ----------
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            video.srcObject = stream;
            video.style.display = 'block';

            statusDot.classList.add('active');
            statusText.textContent = 'Cámara activa · Cargando modelos…';

            video.addEventListener('playing', () => {
                loadModelsAndDetect();
            });
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);

            video.style.display = 'none';
            errorMessage.classList.add('visible');

            statusDot.classList.add('error');
            statusText.textContent = 'Sin acceso a la cámara';
        }
    }

    // ---------- face-api.js ----------
    async function loadModelsAndDetect() {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/';

        try {
            statusText.textContent = 'Cámara activa · Descargando modelos…';

            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

            modelsLoaded = true;
            toggleBtn.disabled = false;
            statusText.textContent = 'Cámara activa · Listo para capturar';
            console.log('Modelos de face-api.js cargados correctamente');
            detectLoop();
        } catch (err) {
            console.error('Error cargando modelos de face-api.js:', err);
            statusText.textContent = 'Cámara activa · Error al cargar modelos';
        }
    }

    async function detectLoop() {
        if (video.paused || video.ended) return;

        if (detecting) {
            requestAnimationFrame(detectLoop);
            return;
        }

        detecting = true;

        try {
            const detections = await faceapi.detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({
                    inputSize: 320,
                    scoreThreshold: 0.5
                })
            );

            if (captureEnabled && detections.length > 0) {
                const now = Date.now();
                if (now - lastCaptureTime > COOLDOWN_MS) {
                    lastCaptureTime = now;
                    capturePhoto(detections.length);
                }
            }
        } catch (err) {
            if (err.name !== 'InvalidStateError') {
                console.error('Error en detección:', err);
            }
        }

        detecting = false;
        requestAnimationFrame(detectLoop);
    }

    // ---------- Captura de foto ----------
    function capturePhoto(faceCount) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        triggerFlash();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `kira-rostro-${timestamp}.png`;

        canvas.toBlob(blob => {
            if (!blob) return;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            addThumbnail(url, faceCount);

            photosTaken++;
            photoCounter.textContent = `${photosTaken} foto${photosTaken !== 1 ? 's' : ''} capturada${photosTaken !== 1 ? 's' : ''}`;

            console.log(`📸 Foto capturada: ${filename} (${faceCount} rostro${faceCount > 1 ? 's' : ''})`);
        }, 'image/png');
    }

    function triggerFlash() {
        flashOverlay.classList.add('active');
        setTimeout(() => flashOverlay.classList.remove('active'), 200);
    }

    function addThumbnail(url, faceCount) {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumb';

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Captura';

        const badge = document.createElement('span');
        badge.className = 'face-badge';
        badge.textContent = `👤 ${faceCount}`;

        thumb.appendChild(img);
        thumb.appendChild(badge);
        gallery.prepend(thumb);

        while (gallery.children.length > 10) {
            gallery.removeChild(gallery.lastChild);
        }
    }

    initCamera();
});
