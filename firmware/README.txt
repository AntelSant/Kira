Este codigo es el cliente fisico de sistema. Su trabajo es capturar, empaquetar y mostrar retroalimentacion.

	+ include/config.h: Aqui se definira las constantes del sistema: credenciales WIFI, pines de la camara OV2640, pines de la pantalla OLED SSD1306, y la IP/puerto del Servidor 1.
	
	+ src/camera_utils.cpp: Funciones para inicializar el sensor OV	2640 a una resolucion de 640x480 en formato JPEG y convertir el buffer de la imagen a una cadena Base 64. Tambien debe incluir una logica.
	
	+ src/display_utils.cpp: El bucle principal. Mantendra la conexion WIFI activa. Al detectar a alguien, armara un objeto JSON con los campos foto_base64, fecha, hora y grupo_id. Enviaraeste JSON 
	  mediante un HTTP POST sincrono al Servidor 1 (/api/capture). Finalmente, leera el codigo de respuesta (ej. 200, 401, 403) para decirle a la pantalla que sticker mostrar.

