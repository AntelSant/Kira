#!/bin/bash
echo "🗄️ Iniciando Servidor 3 (Base de Datos/Gestión)..."

# 1. Entrar a la carpeta de la API
cd ~/Documentos/Kira/server3-bd/api-gestion || exit

# 2. Activar el entorno virtual
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# 3. Leer el puerto desde .env (default 8003)
PORT=$(grep -oP '^SERVER3_PORT=\K.*' .env 2>/dev/null || echo "8003")

# 4. Levantar Uvicorn
uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
