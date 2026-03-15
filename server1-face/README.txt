Este es el motor de inferencia principal (Python/FastAPI) que correra aprovechando la RTX 4050. (Este servidor estara en la lap de Santiago).

	+ app/core/vision.py: Una clase que inicialice los modelos de IA en la GPU (device='cuda'). Tendra un metodo para detectar y recordar rostros usando MTCNN, y otro metodo para generar el embedding 
	  facial de 512 dimensiones usando InsightFace/ArcFace.

	+ app/core/attendance.py: La logica de negocio. Recibira la identidad detectada y consultara la base de datos (Servidor 3) para verificar si la persona pertenece al grupo especificado. Tambien 
	  calculara si la hora de llegada esta dentro del rango permitido (hora de inicio/fin + tolerancia) para clasificarlo como a tiempo, retardo o fuera de horario.

	+ app/routers/capture.py: Definira el endpoint POST /api/capture. Este endpoint coordina todo: dedodifica el JSON, llama a vision.py para identificar, llama a attendance.py para validar, y devuelve
	  la respuesta sincronaal ESP32.

	+ app/routers/register.py: Definira el endpoint POST /api/register para recibir multiples fotos de un usuario nuevo, calcular su embedding promedio y enviarlo a guardar a la base de datos.

	+ app/core/async_task.py: Una funcion que use httpx.AsyncClient para enviar la imagen (junto con el ID del usuario, fecha, hora y contexto) al Servidor 2 en segundo plano, para que el ESP32 no se
	  quede esperando.
