#!/bin/bash
echo "🚀 Iniciando Servidor 1 (Face/Cámara)..."

# 1. Entrar a la carpeta del servidor
cd ~/Documentos/Kira/server1-face || exit

# 2. Activar el entorno virtual
yay -S python311
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install "pillow>=12.1.1" "numpy>=2.0.0"
pip install -r requirements.txt

# 3. Leer el puerto desde .env (default 8001)
PORT=$(grep -oP '^SERVER1_PORT=\K.*' .env 2>/dev/null || echo "8001")

# 4. Levantar Uvicorn
uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
