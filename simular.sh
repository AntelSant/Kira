#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Iniciando Simulador Web ESP32 de Kira...${NC}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detectar Sistema Operativo
if [ -f /etc/arch-release ]; then
    OS="arch"
else
    OS="ubuntu"
fi

# Ejecutar el script original del simulador
bash "$DIR/script_inicio/$OS/start_simulador.sh" "$@"
