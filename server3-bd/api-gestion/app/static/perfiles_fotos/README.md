Aqui se almacenaran las fotografias de perfil en formato .jpg


Para almacenar la foto como una ruta (String) en lugar de binario, el proceso se divide en dos partes: guardar el archivo físico en una carpeta de tu servidor y guardar solo el "link" o ruta en tu base de datos PostgreSQL.


Para que el codigo funcione correctamente es necesario tener ejecutar los siguientes comandos en la carpeta /home/antelsant/Documentos/Kira/server3-bd/api-gestion:

    python3 -m venv venv
    source venv/bin/activate

    pip install sqlalchemy psycopg2-binary

#Ignora esta linea#