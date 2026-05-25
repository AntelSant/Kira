#!/bin/bash

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Deteniendo servidores Kira...${NC}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

function kill_if_exists() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            echo -e "${GREEN}Proceso PID $pid terminado.${NC}"
        fi
        rm "$pid_file"
    fi
}

echo -e "Cerrando Servidor 1..."
kill_if_exists "$DIR/server1-face/server1.pid"

echo -e "Cerrando Servidor 2..."
kill_if_exists "$DIR/server2-emotion/server2.pid"

echo -e "Cerrando Servidor 3..."
kill_if_exists "$DIR/server3-bd/api-gestion/server3.pid"

echo -e "Cerrando Simulador..."
kill_if_exists "$DIR/simuladorESP32/simulador.pid"

# Medida de seguridad extra para limpiar puertos bloqueados
echo -e "Asegurando liberación de puertos..."
for PORT in 8001 8002 8003 8080; do
    # Usar fuser si lsof no está disponible, ambos devuelven PIDs
    PIDS=$(lsof -t -i:$PORT 2>/dev/null || fuser $PORT/tcp 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo -e "${YELLOW}Matando procesos rezagados en puerto $PORT...${NC}"
        kill -9 $PIDS 2>/dev/null
    fi
done

echo -e "${GREEN}¡Todos los servidores detenidos exitosamente!${NC}"
