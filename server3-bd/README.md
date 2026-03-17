

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
            Estando dentro de la carpeta /server3-db, ejecuta el comando para que Docker lea el archivo docker-compose.yml y encienda PostgreSQL en segundo plano:

            Bash
            docker compose up -d
            Para confirmar que está corriendo, puedes escribir docker ps y deberías ver el contenedor uas_postgres activo.

        Paso 3: Preparar el entorno de Python
            Ahora entra a la carpeta de la API para instalar las librerías necesarias:

            Bash
            cd api-gestion
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
        Paso 4: Inyectar las tablas en PostgreSQL
            Con el entorno activado y la base de datos corriendo, ejecuta el script que acabamos de crear para que SQLAlchemy construya toda la estructura:

            Bash
            python init_db.py
            Verás el mensaje "¡Tablas creadas con éxito!".