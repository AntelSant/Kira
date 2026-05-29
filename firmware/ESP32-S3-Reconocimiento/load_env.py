"""
load_env.py — Extra script de PlatformIO (pre-build)
Lee el archivo .env ubicado en la raíz del proyecto e inyecta cada variable
como una macro del preprocesador usando CPPDEFINES de SCons.

Uso en platformio.ini:
    extra_scripts = pre:load_env.py

Formato del .env:
    CLAVE=valor            # string → -DCLAVE=\"valor\"
    CLAVE=1234             # numérico → -DCLAVE=1234
    CLAVE="valor"          # las comillas externas se eliminan automáticamente
    # líneas con # son comentarios y se ignoran
"""

import os
Import("env")  # noqa: F821  (Import es una función global de SCons/PlatformIO)

ENV_FILE = os.path.join(env["PROJECT_DIR"], ".env")

if not os.path.isfile(ENV_FILE):
    print(f"[load_env] ADVERTENCIA: No se encontró el archivo .env en {ENV_FILE}")
    print("[load_env] Copia .env.example → .env y completa tus valores.")
else:
    print(f"[load_env] Cargando variables desde {ENV_FILE}")
    defines = []

    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()

            # Ignorar comentarios y líneas vacías
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue

            key, _, value = line.partition("=")
            key   = key.strip()
            value = value.strip()

            # Eliminar comillas dobles o simples que rodeen el valor
            if len(value) >= 2 and (
                (value.startswith('"') and value.endswith('"')) or
                (value.startswith("'") and value.endswith("'"))
            ):
                value = value[1:-1]

            if not value:
                continue  # ignorar variables sin valor

            if value.lstrip("-").isdigit():
                # Valor numérico: se pasa sin comillas → -DCLAVE=1234
                defines.append((key, value))
                print(f"[load_env]   {key} = {value}")
            else:
                # Valor string: SCons necesita las comillas escapadas → -DCLAVE=\"valor\"
                defines.append((key, f'\\"{ value }\\"'))
                print(f'[load_env]   {key} = "{value}"')

    env.Append(CPPDEFINES=defines)
    print(f"[load_env] {len(defines)} variable(s) inyectada(s) correctamente.")
