#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Iniciando Servidor 1 (Face/Cámara)...${NC}"

# 1. Obtener la ruta absoluta del script automáticamente
# Busca el directorio donde vive este archivo .sh y entra en él
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! cd "$DIR"; then
    echo -e "${RED}Error: No se pudo acceder a $DIR${NC}"
    exit 1
fi

echo -e "Directorio de trabajo establecido en: ${YELLOW}$DIR${NC}"

cd ..
cd ..

echo -e "Entrando a la carpeta del servidor..."
cd server1-face

# 2. Comprobar Python 3.11
if ! command -v python3.11 &> /dev/null; then
    echo -e "${YELLOW}Python 3.11 no encontrado. Instalando desde AUR...${NC}"
    yay -S --needed --noconfirm python311
fi

# 3. Gestión inteligente del entorno virtual
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creando entorno virtual por primera vez...${NC}"
    python3.11 -m venv venv
    source venv/bin/activate.fish
    
    echo -e "${YELLOW}Instalando dependencias pesadas...${NC}"
    pip install --upgrade pip setuptools wheel
    pip install "pillow>=12.1.1" "numpy>=2.0.0"
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# 4. Forzar actualización manual (Uso: ./start.sh --update)
if [[ "$1" == "--update" ]]; then
    echo -e "${YELLOW}Actualizando dependencias (flag --update detectado)...${NC}"
    pip install -r requirements.txt
fi

# 5. Leer el puerto desde .env
PORT=$(grep -oP '^SERVER1_PORT=\K.*' .env 2>/dev/null || echo "8001")

# 6. Levantar Uvicorn
echo -e "${GREEN}Servidor listo en el puerto $PORT. Levantando Uvicorn...${NC}"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload