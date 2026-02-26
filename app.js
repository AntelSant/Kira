document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const errorMessage = document.querySelector('.error-message');

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
            statusText.textContent = 'Cámara activa';
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);

            video.style.display = 'none';
            errorMessage.classList.add('visible');

            statusDot.classList.add('error');
            statusText.textContent = 'Sin acceso a la cámara';
        }
    }

    initCamera();
});
