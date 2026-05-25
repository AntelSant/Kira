#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
MAGENTA='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${MAGENTA} Iniciando Simulador ESP32 (Interfaz Web)...${NC}"

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
# El || exit protege el script si la carpeta no existe
cd simuladorESP32 || exit

# 2. Comprobar el módulo venv de Python específico para Ubuntu
if ! dpkg -s python3-venv &> /dev/null; then
    echo -e "${YELLOW}El paquete python3-venv no se encontró. Instalando con APT (pedirá contraseña)...${NC}"
    sudo apt update
    sudo apt install -y python3-venv
fi

# 3. Gestión inteligente del entorno virtual (usando .venv)
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creando entorno virtual por primera vez...${NC}"
    python3 -m venv .venv
    source .venv/bin/activate
    
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    pip install --upgrade pip setuptools wheel
    pip install -r requirements.txt
else
    # Arranque instantáneo si el entorno ya existe
    source .venv/bin/activate
fi

# 4. Forzar actualización manual (Uso: ./start.sh --update)
if [[ "$*" == *"--update"* ]]; then
    echo -e "${YELLOW}Actualizando dependencias (flag --update detectado)...${NC}"
    pip install -r requirements.txt
fi

# 5. Levantar Uvicorn de forma limpia
echo -e "${GREEN} Servidor de simulación listo. Abre tu navegador en: http://localhost:8080${NC}"
if [[ "$*" == *"--daemon"* ]]; then
    echo -e "${YELLOW}Ejecutando en segundo plano. Logs en simulador.log${NC}"
    nohup uvicorn simular_esp32_web:app --host 0.0.0.0 --port 8080 --reload > simulador.log 2>&1 &
    echo $! > simulador.pid
else
    exec uvicorn simular_esp32_web:app --host 0.0.0.0 --port 8080 --reload
fi