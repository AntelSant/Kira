El orquestador de datos (Python/FastAPI) corriendo en contenedores Docker.

	+ app/db/models.py: Definicion del esquemacon SQLAlchemy. Se deben de crear las clases exactas para las tablas usuarios (con campo BYTEA para los embeddings), materias, grupos, horarios, 
	  inscripciones, asistencia y emociones.

	+ app/routers/users.py, groups.py, schedules.py: Endpoints CRUD para crear alumnos, profesores, asignar materias a grupos y definir los horarios con sus tolerancias.

	+ app/routers/records.py: Endpoints de escritura llamados por los otros servidores: POST /api/asistencia y POST /api/emociones.

	+ app/routers/reports.py: Endpoints de lectura masiva que el Dashboard de Angular consumira para generar graficas y tablas por fecha o grupo.
