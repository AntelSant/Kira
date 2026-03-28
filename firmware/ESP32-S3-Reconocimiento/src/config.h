#ifndef CONFIG_H
#define CONFIG_H

// Credenciales WiFi (Cámbialas por las tuyas)
const char *WIFI_SSID = "Totalplay-F3AA";
const char *WIFI_PASSWORD = "F3AA8DA12rkzBTHF";

// Configuración del Servidor 1 (CachyOS)
const char *SERVER_URL = "http://192.168.100.95:8001/api/capture";

// ID del grupo registrado en la base de datos (cámbialo si cambias de grupo)
#define GRUPO_ID 1

// Pines de la cámara Freenove ESP32-S3 WROOM
#define PWDN_GPIO_NUM -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 15
#define SIOD_GPIO_NUM 4
#define SIOC_GPIO_NUM 5
#define Y9_GPIO_NUM 16
#define Y8_GPIO_NUM 17
#define Y7_GPIO_NUM 18
#define Y6_GPIO_NUM 12
#define Y5_GPIO_NUM 10
#define Y4_GPIO_NUM 8
#define Y3_GPIO_NUM 9
#define Y2_GPIO_NUM 11
#define VSYNC_GPIO_NUM 6
#define HREF_GPIO_NUM 7
#define PCLK_GPIO_NUM 13

// Pines de tu pantalla OLED (Los usaremos pronto)
#define OLED_SDA_PIN 41
#define OLED_SCL_PIN 42

#endif