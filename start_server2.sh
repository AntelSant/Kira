#!/bin/bash
echo "🎭 Iniciando Servidor 2 (Análisis de Emociones)..."

# 1. Entrar a la carpeta del servidor
cd ~/Documentos/Kira/server2-emotion || exit

# 2. Activar el entorno virtual
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# 3. Leer el puerto desde .env (default 8002)
PORT=$(grep -oP '^SERVER2_PORT=\K.*' .env 2>/dev/null || echo "8002")

# 4. Levantar Uvicorn
uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
