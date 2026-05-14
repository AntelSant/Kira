import os
import base64
import requests
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import uvicorn

# --- CONFIGURACIÓN ---
SERVER_URL = "http://127.0.0.1:8001/api/capture"
API_KEY = os.getenv("API_KEY", "kira_default_secret_key")

app = FastAPI(title="Simulador Web ESP32")

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador ESP32 - Kira</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #121212;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .container {
            background-color: #1e1e1e;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.5);
            max-width: 500px;
            width: 100%;
        }
        h1 { color: #4CAF50; text-align: center; margin-top: 0; font-size: 24px; }
        label { display: block; margin-top: 15px; font-weight: bold; color: #a0a0a0; }
        input[type="text"], input[type="file"] {
            width: 100%;
            padding: 10px;
            margin-top: 8px;
            border-radius: 6px;
            border: 1px solid #333;
            background-color: #2c2c2c;
            color: #fff;
            box-sizing: border-box;
        }
        input[type="file"] { padding: 8px; cursor: pointer; }
        button {
            padding: 10px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.2s, opacity 0.2s;
        }
        button:hover { background-color: #45a049; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline {
            background-color: transparent;
            border: 1px solid #4CAF50;
            color: #4CAF50;
        }
        .btn-outline:hover { background-color: rgba(76,175,80,0.12); }
        .btn-full { width: 100%; padding: 12px; margin-top: 20px; font-size: 16px; }
        /* Tabs */
        .tabs { display: flex; gap: 8px; margin: 18px 0 12px; }
        .tab-btn {
            flex: 1;
            padding: 9px;
            font-size: 13px;
            background: #2c2c2c;
            color: #a0a0a0;
            border: 1px solid #333;
            border-radius: 6px;
        }
        .tab-btn.active { background: #4CAF50; color: #fff; border-color: #4CAF50; }
        .tab-panel { display: none; }
        .tab-panel.active { display: block; }
        /* Camera preview */
        .camera-preview {
            width: 100%;
            aspect-ratio: 4/3;
            background: #111;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #555;
            font-size: 13px;
            margin-top: 10px;
        }
        .camera-preview video, .camera-preview img {
            width: 100%; height: 100%; object-fit: cover; border-radius: 8px;
        }
        .camera-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .hidden { display: none !important; }
        /* Result */
        .result-box {
            margin-top: 20px;
            padding: 15px;
            background-color: #000;
            border-radius: 6px;
            border: 1px solid #333;
            overflow-x: auto;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 13px;
        }
        .success { color: #4CAF50; }
        .error   { color: #f44336; }
        .loader  { display: none; text-align: center; margin-top: 15px; color: #4CAF50; }
        .alert   { padding: 10px 14px; border-radius: 6px; margin: 10px 0; font-size: 13px; }
        .alert-danger  { background: rgba(244,67,54,0.15);  border: 1px solid #f44336; color: #f44336; }
        .alert-success { background: rgba(76,175,80,0.15);  border: 1px solid #4CAF50; color: #4CAF50; }
    </style>
</head>
<body>
<div class="container">
    <h1>📷 Simulador ESP32</h1>
    <p style="text-align:center;color:#a0a0a0;font-size:14px;margin-bottom:5px;">
        Simula el pase de lista del dispositivo ESP32-CAM.
    </p>

    <label>Aula:</label>
    <input type="text" id="aula" value="Lab. Computo" placeholder="Ej. Lab. Computo">

    <!-- Selector de modo -->
    <div class="tabs">
        <button class="tab-btn active" id="tab-archivo" onclick="switchTab('archivo')">
            📁 Subir Imagen
        </button>
        <button class="tab-btn" id="tab-camara" onclick="switchTab('camara')">
            🎥 Cámara en Vivo
        </button>
    </div>

    <!-- Panel: Archivo -->
    <div class="tab-panel active" id="panel-archivo">
        <label for="foto">Imagen / Foto:</label>
        <input type="file" id="foto" accept="image/*" onchange="previewArchivo(event)">
        <div id="preview-archivo" style="display:none; margin-top:12px;">
            <div class="camera-preview">
                <img id="img-preview-archivo" src="#" alt="Vista previa">
            </div>
        </div>
    </div>

    <!-- Panel: Cámara -->
    <div class="tab-panel" id="panel-camara">
        <div id="alert-zona"></div>
        <div class="camera-preview" id="camera-preview">
            📷 Vista previa de la cámara
        </div>
        <div class="camera-actions">
            <button class="btn-outline" onclick="iniciarCamara()">🎥 Activar Cámara</button>
            <button class="btn-outline hidden" id="btn-capturar" onclick="capturarFoto()">📸 Capturar</button>
            <button class="btn-outline hidden" id="btn-repetir" onclick="reiniciarCamara()">🔄 Repetir</button>
        </div>
        <canvas id="canvas-captura" style="display:none;"></canvas>
    </div>

    <button class="btn-full" onclick="simular()">🚀 Simular Petición</button>
    <div id="loader" class="loader">⏳ Procesando...</div>
    <div id="resultado" class="result-box" style="display:none;"></div>
</div>

<script>
    let modoActivo    = 'archivo';
    let capturedB64   = null;
    let streamActivo  = null;

    // ── Tabs ─────────────────────────────────────────────
    function switchTab(tab) {
        modoActivo = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        document.getElementById('panel-' + tab).classList.add('active');
        if (tab !== 'camara' && streamActivo) {
            streamActivo.getTracks().forEach(t => t.stop());
            streamActivo = null;
        }
    }

    // ── Preview archivo ───────────────────────────────────
    function previewArchivo(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('img-preview-archivo').src = e.target.result;
            document.getElementById('preview-archivo').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // ── Cámara ────────────────────────────────────────────
    async function iniciarCamara() {
        limpiarAlerta();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostrarAlerta('danger', '⚠️ Tu navegador no soporta la cámara, o accede por <strong>localhost</strong> en lugar de por IP.');
            return;
        }
        try {
            streamActivo = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            const preview = document.getElementById('camera-preview');
            preview.innerHTML = '<video autoplay playsinline muted></video>';
            const video = preview.querySelector('video');
            video.srcObject = streamActivo;
            await video.play();
            document.getElementById('btn-capturar').classList.remove('hidden');
            document.getElementById('btn-repetir').classList.add('hidden');
            capturedB64 = null;
        } catch (e) {
            let msg = 'No se pudo acceder a la cámara.';
            if      (e.name === 'NotAllowedError')  msg = '🔒 Permiso denegado. Permite la cámara en la barra de dirección del navegador.';
            else if (e.name === 'NotFoundError')    msg = '📷 No se encontró ninguna cámara. Conecta una webcam.';
            else if (e.name === 'NotReadableError') msg = '⚠️ La cámara está en uso por otra aplicación.';
            mostrarAlerta('danger', msg);
        }
    }

    function capturarFoto() {
        const video = document.querySelector('#camera-preview video');
        if (!video) return;
        const canvas = document.getElementById('canvas-captura');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        if (streamActivo) { streamActivo.getTracks().forEach(t => t.stop()); streamActivo = null; }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        document.getElementById('camera-preview').innerHTML = '<img src="' + dataUrl + '" alt="Captura">';
        document.getElementById('btn-capturar').classList.add('hidden');
        document.getElementById('btn-repetir').classList.remove('hidden');
        capturedB64 = dataUrl.split(',')[1];
        limpiarAlerta();
        mostrarAlerta('success', '✅ Foto capturada. Presiona <strong>Simular Petición</strong> para enviar.');
    }

    function reiniciarCamara() {
        capturedB64 = null;
        document.getElementById('camera-preview').innerHTML = '📷 Vista previa de la cámara';
        document.getElementById('btn-capturar').classList.add('hidden');
        document.getElementById('btn-repetir').classList.add('hidden');
        limpiarAlerta();
        iniciarCamara();
    }

    // ── Alertas ───────────────────────────────────────────
    function mostrarAlerta(tipo, html) {
        document.getElementById('alert-zona').innerHTML = '<div class="alert alert-' + tipo + '">' + html + '</div>';
    }
    function limpiarAlerta() { document.getElementById('alert-zona').innerHTML = ''; }

    // ── Simular ───────────────────────────────────────────
    async function simular() {
        const aula = document.getElementById('aula').value.trim();
        if (!aula) { alert('Por favor ingresa un aula.'); return; }

        const loader    = document.getElementById('loader');
        const resultBox = document.getElementById('resultado');
        loader.style.display = 'block';
        resultBox.style.display = 'none';

        try {
            let response;
            if (modoActivo === 'archivo') {
                const fotoInput = document.getElementById('foto');
                if (!fotoInput.files[0]) {
                    alert('Por favor selecciona una imagen primero.');
                    loader.style.display = 'none';
                    return;
                }
                const formData = new FormData();
                formData.append('foto', fotoInput.files[0]);
                formData.append('aula', aula);
                response = await fetch('/api/simular', { method: 'POST', body: formData });
            } else {
                if (!capturedB64) {
                    alert('Primero captura una foto con la cámara.');
                    loader.style.display = 'none';
                    return;
                }
                response = await fetch('/api/simular-b64', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ foto_base64: capturedB64, aula: aula })
                });
            }

            const data = await response.json();
            resultBox.style.display = 'block';
            if (response.ok && data.status === 'success') {
                resultBox.className = 'result-box success';
                resultBox.textContent = '✅ ÉXITO:\n\n' + JSON.stringify(data.server_response, null, 2);
            } else {
                resultBox.className = 'result-box error';
                const detalles = data.detail || data.server_response || data;
                resultBox.textContent = '❌ ERROR:\n\n' + JSON.stringify(detalles, null, 2);
            }
        } catch (error) {
            resultBox.style.display = 'block';
            resultBox.className = 'result-box error';
            resultBox.textContent = '❌ Fallo de conexión:\n\n' + error.message;
        } finally {
            loader.style.display = 'none';
        }
    }
</script>
</body>
</html>"""


# ============================================================
#  Endpoints
# ============================================================

@app.get("/", response_class=HTMLResponse)
async def get_index():
    return HTMLResponse(content=HTML_TEMPLATE, status_code=200)


@app.post("/api/simular")
async def simular_peticion(aula: str = Form(...), foto: UploadFile = File(...)):
    """Modo archivo: recibe multipart/form-data, convierte a base64 y reenvía a Server1."""
    try:
        contents = await foto.read()
        img_b64 = base64.b64encode(contents).decode('utf-8')

        ahora = datetime.now()
        payload = {
            "foto_base64": img_b64,
            "aula": aula,
            "fecha": ahora.strftime("%Y-%m-%d"),
            "hora":  ahora.strftime("%H:%M:%S")
        }

        response = requests.post(SERVER_URL, json=payload, headers={"X-API-Key": API_KEY}, timeout=30)
        try:
            resp_json = response.json()
        except Exception:
            resp_json = response.text

        if response.status_code == 200:
            return {"status": "success", "server_response": resp_json}
        else:
            return {"status": "error", "server_response": resp_json, "status_code": response.status_code}

    except Exception as e:
        return {"status": "error", "detail": str(e)}


class SimularB64Request(BaseModel):
    foto_base64: str
    aula: str


@app.post("/api/simular-b64")
async def simular_b64(data: SimularB64Request):
    """Modo cámara: recibe JSON con foto_base64 y aula, reenvía directamente a Server1."""
    try:
        ahora = datetime.now()
        payload = {
            "foto_base64": data.foto_base64,
            "aula": data.aula,
            "fecha": ahora.strftime("%Y-%m-%d"),
            "hora":  ahora.strftime("%H:%M:%S")
        }

        response = requests.post(SERVER_URL, json=payload, headers={"X-API-Key": API_KEY}, timeout=30)
        try:
            resp_json = response.json()
        except Exception:
            resp_json = response.text

        if response.status_code == 200:
            return {"status": "success", "server_response": resp_json}
        else:
            return {"status": "error", "server_response": resp_json, "status_code": response.status_code}

    except Exception as e:
        return {"status": "error", "detail": str(e)}


if __name__ == "__main__":
    print("=" * 50)
    print("🚀 INICIANDO SIMULADOR WEB ESP32")
    print("🌍 Abre tu navegador en: http://localhost:8080")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8080)
