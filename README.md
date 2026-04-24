Estructura del proyecto:

/uas-asistencia-ia
├── /firmware                  # Código en C/C++ para el ESP32-CAM 
│   ├── src/                   # Lógica principal de captura y envío HTTP 
│   └── include/               # Archivos de cabecera y configuraciones
├── /server1-face              # API FastAPI para reconocimiento facial 
│   ├── app/
│   │   ├── models/            # Modelos Pydantic y lógica de ArcFace/MTCNN [cite: 210, 235]
│   │   ├── routers/           # Endpoints (ej. /api/capture) 
│   │   └── core/              # Lógica de asistencia y reenvío asíncrono [cite: 250, 262]
│   ├── requirements.txt
│   └── Dockerfile             # Opcional, ya que mencionas que correrá directo en tu CachyOS [cite: 50]
├── /server2-emotion           # API FastAPI para análisis de estado de ánimo 
│   ├── app/
│   │   ├── emotion_model/     # Lógica de HSEmotion o DeepFace [cite: 271]
│   │   └── routers/           # Endpoints (ej. /api/emotion) [cite: 272]
│   └── requirements.txt
└── /server3-bd                # Base de datos y Dashboard en Vanilla JS 
    ├── /api-gestion           # FastAPI con endpoints CRUD, reportes y sirve el Dashboard estático [cite: 298, 305]
    │   └── /app/static/dashboard # Frontend SPA en HTML/CSS/JS Puro (Dashboard responsivo de ancho completo)
    └── docker-compose.yml     # Orquestación de PostgreSQL y API [cite: 194, 195]


firmware/: Contendra todo el codigo en C/C++ necesario para el microcontrolador, desarrollado utilizando Arduino IDE.
	src/: 	Aqui se encontrara el codigo fuente principal (main.cpp o main.ino). Este archivo se encargara de inicializar el sensor OV2640 (camara) para capturar imagenes a 640x480 pixeles en formato JPEG.
		Tambien debera manejar la conexion WIFI, la codificacion de la imagen a Base64, y la construccion del JSON que se enviara via HTTP POST de forma sincrona.
	
	include/:	En esta subcarpeta se almacenaran los archivos de cabecera (.h), donde definiras credenciales de red, pines de conexion para la pantalla OLED SSD1306, y configuraciones globales.


server1-face/:	Este es el "cerebro" principal del sistema que se ejecutara en tu entorno principal con CachyOS. Esta estructurado como una aplicacion moderna de FastAPI.
	app/models/:	Aqui se colocaran dos cosas: los esquemas de datos (usados en Pydantic) para validar los JSON que lleguen del ESP32, y los scripts o clases que encapsulan la carga de los modelos de IA
			(MTCNN para deteccion y ArcFace para generacion de embeddings).
	
	app/routers/:	Contendra los controladores de las rutas de la APLI. Principalmente, aqui definiras el endpoint /api/capture y /api/register.

	app/core/:	Aqui va la logica del negocio "dura". Por ejemplo, los algoritmos para verificar si el usuario pertenece al grupo correcto, calcular las tolerancias de horario, registrar asistencias y
			ausencias, y la funcion asincrona (usando httpx) que reencia la imagen al Servidor 2.

	requirements.txt:	Aqui se listaran las dependencias exactas de Python para este servidor:
				
				+ fastapi y uvicorn (para levantar la API web).
				+ torch y torchvision (configurados para usar aceleracion CUDA).
				+ facenet-pytorch (para implementar MTCNN).
				+ insightface (para el modelo de ArcFace).
				+ httpx (para actuar como cliente HTTP aincrono y enviar datos al Servidor 2).
				+ pydantic (para validacion de datos).

server2-emotion/: Este modulo se ejecutara en el segundo equipo (Windows con WSL2) y tiene un proposito unico y aislado.
	app/emotion_model/: 	Contendra los scrips encargados de cargar HSEmotion o DeepFace. Aqui tambien se programara la funcion que mapea las 7 emociones base en las 3 categorias requeridas en el anteproyecto:
	positivo, neutro y negativo.

	app/routers: 	Definira el endpoint asincrono /api/emotion que recibe los datos reenviados por el Servidor 1.

	requeriments.txt:	Sus dependencias son mas ligeras, enfocadas a su tarea especifica:
				
				+ fastapi y uvicorn.
				+ torch o torchvision (con soporte CUDA para WSL2).
				+ hsemotion o deepface (se debe de elegir una).
				+ httpx (para enviar el resultado final al Servidor 3).


server3-bd/: Este directorio centraliza la persistencia de los datos y la interfaz grafica de usuario en el tercer equipo.
	/api-gestion:	Es la aplicacion FastAPI que actua como el backend administrativo y sirve la SPA del dashboard. Contendra los endpoints CRUD para registrar materias, alumnos, profesores y horarios, y cuenta con soporte CORS para solicitudes a localhost.

		requeriments.txt:	incluira fastapi, uvicorn, sqlalchemy (como ORM para mapear la base de datos), alembic (para migraciones del esquema) y psycopg2-binary (el conector con PostgreSQL).

	/api-gestion/app/static/dashboard:	Aqui reside el codigo fuente del Frontend en Vanilla JS. Contendra los componentes de visualizacion y formularios de gestion, con un diseño de UI adaptado al espacio completo de la pantalla.

	/docker-compose.yml: 	El archivo de orquestacion vital. Definira los siguientes conectores o servicios:
					1. La base de datos PosgreSQL 16 con un volumen persistente para no perder informacion si se reinicia.
					2. El contenedor de la api-gestion (que incluye el frontend servido estáticamente).




Para instalar todas las dependencias necesarias para cada proyecto es necesario hacer lo sigueinte:

	# 1. Entrar a la carpeta del servidor
		cd uas-asistencia-ia/carpeta_proyecto

	# 2. Crear un entorno virtual para no afectar el sistema base
		python3 -m venv venv

	# 3. Activar el entorno virtual
		source venv/bin/activate

	# 4. Instalar las dependencias (incluyendo PyTorch con CUDA 12.1)
		pip install -r requirements.txt


	Asi se ejecutan los script de inicio de los servidores, si ocupas permisos primero dale permisos de ejecucion sudo chmod +x:
		# Servidor 1 — Reconocimiento Facial (Puerto 8001)
		bash ~/Documentos/Kira/start_server1.sh

		# Servidor 3 — API de Gestión / Base de Datos (Puerto 8003)
		bash ~/Documentos/Kira/start_server3.sh












