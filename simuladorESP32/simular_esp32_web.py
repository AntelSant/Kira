import base64
import requests
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse
import uvicorn

# --- CONFIGURACIÓN ---
SERVER_URL = "http://127.0.0.1:8001/api/capture"

app = FastAPI(title="Simulador Web ESP32")

HTML_TEMPLATE = """
<!DOCTYPE html>
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
        }
        .container {
            background-color: #1e1e1e;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.5);
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #4CAF50;
            text-align: center;
            margin-top: 0;
            font-size: 24px;
        }
        label {
            display: block;
            margin-top: 15px;
            font-weight: bold;
            color: #a0a0a0;
        }
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
        input[type="file"] {
            padding: 8px;
            cursor: pointer;
        }
        button {
            width: 100%;
            padding: 12px;
            margin-top: 25px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #45a049;
        }
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
        .error { color: #f44336; }
        .loader {
            display: none;
            text-align: center;
            margin-top: 15px;
            color: #4CAF50;
        }
    </style>
</head>
<body>

<div class="container">
    <h1>📷 Simulador ESP32</h1>
    <p style="text-align: center; color: #a0a0a0; font-size: 14px; margin-bottom: 25px;">Selecciona una imagen y un aula para simular el pase de lista.</p>
    
    <label for="aula">Aula:</label>
    <input type="text" id="aula" name="aula" value="Lab. Computo" placeholder="Ej. Lab. Computo">
    
    <label for="foto">Imagen / Foto:</label>
    <input type="file" id="foto" name="foto" accept="image/*" required onchange="previewImage(event)">
    <div id="preview" style="text-align: center; margin-top: 15px; display: none;">
        <img id="img-preview" src="#" alt="Vista previa" style="max-width: 100%; max-height: 200px; border-radius: 6px;">
    </div>

    <button onclick="simular()">Simular Petición</button>
    <div id="loader" class="loader">Procesando...</div>

    <div id="resultado" class="result-box" style="display:none;"></div>
</div>

<script>
    function previewImage(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('img-preview').src = e.target.result;
                document.getElementById('preview').style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    }

    async function simular() {
        const fotoInput = document.getElementById('foto');
        const aulaInput = document.getElementById('aula');
        const loader = document.getElementById('loader');
        const resultBox = document.getElementById('resultado');

        if (!fotoInput.files[0]) {
            alert('Por favor selecciona una imagen primero.');
            return;
        }
        if (!aulaInput.value) {
            alert('Por favor ingresa un aula.');
            return;
        }

        const formData = new FormData();
        formData.append('foto', fotoInput.files[0]);
        formData.append('aula', aulaInput.value);

        loader.style.display = 'block';
        resultBox.style.display = 'none';

        try {
            const response = await fetch('/api/simular', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            resultBox.style.display = 'block';
            if (response.ok && data.status === 'success') {
                resultBox.className = 'result-box success';
                resultBox.innerHTML = `✅ ÉXITO:\n\n${JSON.stringify(data.server_response, null, 2)}`;
            } else {
                resultBox.className = 'result-box error';
                const detalles = data.detail || data.server_response || data;
                resultBox.innerHTML = `⚠️ ERROR:\n\n${JSON.stringify(detalles, null, 2)}`;
            }
        } catch (error) {
            resultBox.style.display = 'block';
            resultBox.className = 'result-box error';
            resultBox.innerHTML = `❌ Fallo de conexión o error interno:\n\n${error.message}`;
        } finally {
            loader.style.display = 'none';
        }
    }
</script>

</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def get_index():
    return HTMLResponse(content=HTML_TEMPLATE, status_code=200)

@app.post("/api/simular")
async def simular_peticion(aula: str = Form(...), foto: UploadFile = File(...)):
    try:
        # 1. Leer imagen y convertir a base64
        contents = await foto.read()
        img_b64 = base64.b64encode(contents).decode('utf-8')
        
        # 2. Fechas
        ahora = datetime.now()
        fecha_str = ahora.strftime("%Y-%m-%d")
        hora_str = ahora.strftime("%H:%M:%S")

        # 3. Payload
        payload = {
            "foto_base64": img_b64,
            "aula": aula,
            "fecha": fecha_str,
            "hora": hora_str
        }

        # 4. Enviar
        response = requests.post(SERVER_URL, json=payload, timeout=30)
        
        try:
            resp_json = response.json()
        except:
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
