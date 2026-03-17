Un microservicio dedicado (Python/FastAPI) en la laptop con la RTX 3050. (Este servidor correra en laptop de Emiliano)

	+ app/emotion_model/classifier.py: Es una clase clase que cargue el modelo HSEmotion o DeepFace. Debe incluir un metodo que reciba la imagen, ejecute la inferencia y mapee obligatoriamente el 
	  resultado de 7 emociones a solo 3 categorias: positivo(happy, surprise), neutro(neutral) o negativo (sad, angry, fear, disgust).

	+ app/routers/emotion.py: El endpoints POST /api/emotion. Recibira los datos reenviados por el Servidor 1, llamara al clasificador, y hara un POST sincrono al Servidor 3 (/api/emociones) para guardar 
	  el registro de la emocion, la confianza y el contexto en la base de datos.
