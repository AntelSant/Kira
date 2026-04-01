#!/bin/bash
echo "📷 Iniciando Simulador ESP32 (Interfaz Web)..."

# 1. Entrar a la carpeta del simulador
cd ~/Documentos/Kira/simuladorESP32 || exit

# 2. Activar el entorno virtual (lo crea si no existe)
python3 -m venv .venv
source .venv/bin/activate

# 3. Instalar dependencias necesarias
pip install --upgrade pip
pip install fastapi uvicorn requests python-multipart

# 4. Lanzar el simulador en el puerto 8080
echo "🌍 Abre tu navegador en: http://localhost:8080"
uvicorn simular_esp32_web:app --host 0.0.0.0 --port 8080 --reload
