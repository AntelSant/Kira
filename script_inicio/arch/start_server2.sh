#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${BLUE}🎭 Iniciando Servidor 2 (Análisis de Emociones)...${NC}"

# 1. Obtener la ruta absoluta del script automáticamente
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! cd "$DIR"; then
    echo -e "${RED}Error: No se pudo acceder a $DIR${NC}"
    exit 1
fi

echo -e "Directorio de trabajo establecido en: ${YELLOW}$DIR${NC}"

cd ..
cd ..

echo -e "Entrando a la carpeta del servidor..."
cd server2-emotion

# 2. Gestión inteligente del entorno virtual
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creando entorno virtual por primera vez...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    pip install --upgrade pip setuptools wheel
    pip install -r requirements.txt
else
    # Arranque instantáneo si el entorno ya existe
    source venv/bin/activate
fi

# 3. Forzar actualización manual (Uso: ./start.sh --update)
if [[ "$1" == "--update" ]]; then
    echo -e "${YELLOW}Actualizando dependencias (flag --update detectado)...${NC}"
    pip install -r requirements.txt
fi

# 4. Leer el puerto desde .env (default 8002)
PORT=$(grep -oP '^SERVER2_PORT=\K.*' .env 2>/dev/null || echo "8002")

# 5. Levantar Uvicorn de forma limpia
echo -e "${GREEN}Servidor de emociones listo en el puerto $PORT. Levantando Uvicorn...${NC}"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload