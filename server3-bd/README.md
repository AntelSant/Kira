

    Para poder integrar el Servidor 3 (Base de datos y Dashboard) es necesario tener los siguientes programas y entornos abiertos:
        + Windows con el subsistema WSL2 (Ubuntu 22.04) instalado.
        + Docker Desktop (configurado para usar el backend de WSL2).
        + Imagen de PostgreSQL version 16.


    Para poder levantar el contenedor se usa el siguiente archivo:

            docker compose up -d

    
    Pasos para ejecutar este proyecto:

        Paso 1: Descargar el código (Clonar)
            Abre la terminal de Ubuntu dentro de WSL2 en el Servidor 3 y descarga tu repositorio:

        Bash
            git clone https://github.com/AntelSant/Kira.git
            cd uas-asistencia-ia/server3-db
            (Cambia la URL por la de tu repositorio real).

        Paso 2: Levantar el contenedor de la Base de Datos

            Es necesario tener activada la extencion de wsl en el docker-desktop

            Estando dentro de la carpeta /server3-db, ejecuta el comando para que Docker lea el archivo docker-compose.yml y encienda PostgreSQL en segundo plano:

            Debes tener el docker-desktop corriendo
            
            Bash
            docker compose up -d
            Para confirmar que está corriendo, puedes escribir docker ps y deberías ver el contenedor uas_postgres activo.

        Paso 3: Preparar el entorno de Python
            Ahora entra a la carpeta de la API para instalar las librerías necesarias:

            Ejecutar este comando para crear la base de datos con el contenedor corriendo:
            sudo docker exec -it kira_postgres psql -U admin -d postgres -c "CREATE DATABASE uas_ai_db;"

            Bash
            cd api-gestion
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt

            Una vez que la base de datos este creada ejecuta este comando para entrar al postgres:
            sudo docker exec -it kira_postgres psql -U admin -d uas_ai_db

            Comandos para visualizar las tablas de postgre en consola:

            Ver la lista de todas las tablas:
                \dt
            
            Ver la estructura de una tabla específica:
                \d usuarios

            Ver si hay datos dentro de una tabla (SQL clásico):
                SELECT * FROM usuarios;

            Salir de la consola de PostgreSQL y volver a tu terminal normal:
                \q

        Paso 4: Inyectar las tablas en PostgreSQL
            Con el entorno activado y la base de datos corriendo, ejecuta el script que acabamos de crear para que SQLAlchemy construya toda la estructura:

            Bash
            python init_db.py
            Verás el mensaje "¡Tablas creadas con éxito!".