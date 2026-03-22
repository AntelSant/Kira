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

# 3. Levantar Uvicorn en el puerto 8001
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
