import os
import urllib.request
import ssl

def download_file(url, filepath):
    # Disable SSL verification for simpler downloading if needed
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    print(f"Descargando {os.path.basename(filepath)}...")
    try:
        with urllib.request.urlopen(url, context=context) as response, open(filepath, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"✓ Descarga completada: {filepath}")
    except Exception as e:
        print(f"✗ Error al descargar {url}: {e}")

def main():
    models_dir = os.path.join(os.path.dirname(__file__), "antispoof_models")
    os.makedirs(models_dir, exist_ok=True)

    models_to_download = [
        {
            "name": "2.7_80x80_MiniFASNetV2.pth",
            "url": "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth"
        },
        {
            "name": "4_0_0_80x80_MiniFASNetV1SE.pth",
            "url": "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/4_0_0_80x80_MiniFASNetV1SE.pth"
        }
    ]

    for model in models_to_download:
        filepath = os.path.join(models_dir, model["name"])
        if not os.path.exists(filepath):
            download_file(model["url"], filepath)
        else:
            print(f"El modelo {model['name']} ya existe. Omitiendo descarga.")

    print("\nVerificación de modelos Anti-Spoofing finalizada.")

if __name__ == "__main__":
    main()
