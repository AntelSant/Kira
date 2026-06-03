#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Iniciando Proyecto Kira - Automático ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Solicitar permisos de administrador desde el principio 
# para que la instalación de dependencias no se bloquee en segundo plano
echo -e "${YELLOW}Se requieren permisos de administrador para instalar dependencias de sistema (si faltan)...${NC}"
sudo -v

# Detectar Sistema Operativo
if [ -f /etc/arch-release ]; then
    OS="arch"
    echo -e "${GREEN}Sistema Detectado: Arch Linux${NC}"
else
    OS="ubuntu"
    echo -e "${GREEN}Sistema Detectado: Ubuntu / Debian${NC}"
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo -e "\n${YELLOW}[1/5] Construyendo Dashboard Web (React)...${NC}"
cd server3-bd/dashboard
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de Node.js...${NC}"
    npm install
fi
echo -e "${YELLOW}Ejecutando npm run build...${NC}"
npm run build
cd "$DIR"

echo -e "\n${YELLOW}[2/5] Levantando Servidor 3 (Base de Datos y Gestión)...${NC}"
# Llamamos a los scripts con el flag --daemon y --update para asegurar dependencias
bash script_inicio/$OS/start_server3.sh --daemon --update
sleep 3 # Damos un margen para que la BD esté lista

echo -e "\n${YELLOW}[3/5] Levantando Servidor 1 (Face/Cámara y Anti-Spoofing)...${NC}"
bash script_inicio/$OS/start_server1.sh --daemon --update
sleep 1

echo -e "\n${YELLOW}[4/5] Levantando Servidor 2 (Análisis de Emociones)...${NC}"
bash script_inicio/$OS/start_server2.sh --daemon --update
sleep 1

echo -e "\n${YELLOW}[5/5] Levantando Simulador Web ESP32...${NC}"
bash script_inicio/$OS/start_simulador.sh --daemon --update

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}¡Todos los servicios iniciados exitosamente en 2do plano!${NC}"
echo -e "Para monitorear los errores y la actividad en tiempo real, ejecuta:"
echo -e "${CYAN}  ./ver_logs.sh${NC}"
echo -e "\nPara detener todo cuando termines, ejecuta:"
echo -e "${YELLOW}  ./stop_all.sh${NC}"
echo -e "${GREEN}=======================================${NC}"
