#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
MAGENTA='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${MAGENTA}📷 Iniciando Simulador ESP32 (Interfaz Web)...${NC}"

# 1. Obtener la ruta absoluta del script automáticamente
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! cd "$DIR"; then
    echo -e "${RED}Error: No se pudo acceder a $DIR${NC}"
    exit 1
fi

echo -e "Directorio de trabajo establecido en: ${YELLOW}$DIR${NC}"

cd ..
cd ..

echo -e "Entrando a la carpeta del simulador..."
cd simuladorESP32

# 2. Gestión inteligente del entorno virtual (nota que usas .venv aquí)
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creando entorno virtual por primera vez...${NC}"
    python3 -m venv .venv
    source .venv/bin/activate.fish
    
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    pip install --upgrade pip setuptools wheel
    pip install fastapi uvicorn requests python-multipart
else
    # Arranque instantáneo si el entorno ya existe
    source .venv/bin/activate
fi

# 3. Forzar actualización manual (Uso: ./start.sh --update)
if [[ "$1" == "--update" ]]; then
    echo -e "${YELLOW}Actualizando dependencias (flag --update detectado)...${NC}"
    pip install --upgrade fastapi uvicorn requests python-multipart
fi

# 4. Levantar Uvicorn de forma limpia
echo -e "${GREEN}🌍 Servidor de simulación listo. Abre tu navegador en: http://localhost:8080${NC}"
exec uvicorn simular_esp32_web:app --host 0.0.0.0 --port 8080 --reload