#!/bin/bash

# Colores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}   Visor de Logs Unificado - Proyecto Kira       ${NC}"
echo -e "${CYAN}=================================================${NC}"
echo -e "${YELLOW}Monitoreando todos los servidores en tiempo real...${NC}"
echo -e "${GREEN}Nota: Puedes presionar [Ctrl+C] en cualquier momento para salir.${NC}"
echo -e "${GREEN}Los servidores SEGUIRÁN CORRIENDO en segundo plano.${NC}"
echo -e "-------------------------------------------------\n"

# Asegurar que los archivos existan para que tail no dé error si se corre antes de que inicien
touch server1-face/server1.log
touch server2-emotion/server2.log
touch server3-bd/api-gestion/server3.log
touch simuladorESP32/simulador.log

# Ejecutar tail sobre todos los archivos al mismo tiempo
tail -f \
  server1-face/server1.log \
  server2-emotion/server2.log \
  server3-bd/api-gestion/server3.log \
  simuladorESP32/simulador.log
