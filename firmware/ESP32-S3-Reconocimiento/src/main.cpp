#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include "base64.hpp" // Librería densaugeo/base64
#include "config.h"   // Tu archivo con pines e IPs

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Aprovechamos la memoria PSRAM de tu ESP32-S3
  if(psramFound()){
    config.frame_size = FRAMESIZE_QVGA; // 640x480
    config.jpeg_quality = 10;          // Alta calidad
    config.fb_count = 2;               // Doble buffer para mayor fluidez
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Error al inicializar la cámara: 0x%x\n", err);
    return;
  }
  Serial.println("✅ Cámara inicializada correctamente.");
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  
  // 1. Conectar al WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando al WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectado. IP de la placa: ");
  Serial.println(WiFi.localIP());

  // 2. Inicializar la cámara
  initCamera();
}

void loop() {
  // Esperar 15 segundos entre capturas para pruebas
  delay(15000); 

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n📸 Tomando foto...");
    camera_fb_t * fb = esp_camera_fb_get();
    
    if (!fb) {
      Serial.println("❌ Error al capturar la imagen. Intentando de nuevo...");
      return;
    }

    Serial.println("🔄 Foto tomada. Codificando a Base64...");
    
    // Convertir a Base64 usando la RAM de forma segura
    int base64_length = encode_base64_length(fb->len);
    unsigned char* base64_buffer = (unsigned char*) malloc(base64_length + 1);
    
    encode_base64(fb->buf, fb->len, base64_buffer);
    base64_buffer[base64_length] = '\0'; // Asegurar el fin de cadena para evitar basura
    
    String base64Image = String((char*)base64_buffer);
    
    // Liberar memoria inmediatamente
    free(base64_buffer); 
    esp_camera_fb_return(fb); 

    // Construir el JSON
    String jsonPayload = "{\"foto_base64\":\"" + base64Image + "\",";
    jsonPayload += "\"grupo_id\":5,";
    jsonPayload += "\"fecha\":\"2026-03-22\",";
    jsonPayload += "\"hora\":\"12:00:00\"}";

    Serial.println("🌐 Enviando JSON por HTTP POST al Servidor 1...");

    // Enviar al Servidor 1 en CachyOS
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      Serial.printf("✅ Código HTTP: %d\n", httpResponseCode);
      String response = http.getString();
      Serial.println("Respuesta del servidor: " + response);
    } else {
      Serial.printf("❌ Error en la conexión: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
  } else {
    Serial.println("⚠️ Desconectado del WiFi. Intentando reconectar...");
    WiFi.reconnect();
  }
}