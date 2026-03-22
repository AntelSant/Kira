#!/bin/bash
echo "🗄️ Iniciando Servidor 3 (Base de Datos/Gestión)..."

# 1. Entrar a la carpeta de la API
cd ~/Documentos/Kira/server3-bd/api-gestion || exit

# 2. Activar el entorno virtual
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Levantar Uvicorn en el puerto 8003
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
