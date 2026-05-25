import os
import json
import base64
from typing import List
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()

# Obtener la clave de cifrado desde las variables de entorno
# La clave debe ser generada y guardada en el .env como base64url o hexadecimal
# Se espera una clave de 32 bytes (256 bits) codificada en base64 para AES-256
ENCRYPTION_KEY_B64 = os.getenv("EMBEDDING_ENCRYPTION_KEY")

def generar_clave() -> str:
    """
    Genera una nueva clave AES-256 aleatoria y la devuelve en formato base64.
    Uso: python -c "from crypto_utils import generar_clave; print(generar_clave())"
    """
    key = AESGCM.generate_key(bit_length=256)
    return base64.b64encode(key).decode('utf-8')

def _obtener_clave() -> bytes:
    if not ENCRYPTION_KEY_B64:
        raise ValueError("La variable de entorno EMBEDDING_ENCRYPTION_KEY no está configurada")
    try:
        return base64.b64decode(ENCRYPTION_KEY_B64)
    except Exception as e:
        raise ValueError(f"Error decodificando la clave de cifrado. Asegúrate de que es base64 válido: {e}")

def cifrar_embedding(vector: List[float]) -> bytes:
    """
    Serializa el vector a JSON, lo cifra con AES-256-GCM y devuelve el blob.
    El blob contiene: nonce (12 bytes) + ciphertext + auth tag (16 bytes).
    """
    if not isinstance(vector, list) or len(vector) != 512:
        raise ValueError("El vector debe ser una lista de 512 elementos")

    key = _obtener_clave()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce recomendado para GCM
    
    # Serializar el vector (podríamos usar struct.pack para mayor eficiencia, pero JSON es robusto)
    import struct
    # Usar struct.pack para 512 floats (4 bytes cada uno = 2048 bytes) -> '<512f'
    # Esto es mucho más eficiente y compacto que JSON
    # '<' significa little-endian, '512f' significa 512 floats
    formato = f'<{len(vector)}f'
    datos_crudos = struct.pack(formato, *vector)
    
    # Cifrar
    datos_cifrados = aesgcm.encrypt(nonce, datos_crudos, None)
    
    # Prepend nonce to the encrypted data
    return nonce + datos_cifrados

def descifrar_embedding(blob_cifrado: bytes) -> List[float]:
    """
    Descifra un blob previamente cifrado con cifrar_embedding y devuelve el vector.
    """
    if not blob_cifrado or len(blob_cifrado) < 12:
        raise ValueError("Blob cifrado inválido")

    key = _obtener_clave()
    aesgcm = AESGCM(key)
    
    # Separar nonce y datos cifrados (el auth tag va incluido al final de datos_cifrados)
    nonce = blob_cifrado[:12]
    datos_cifrados = blob_cifrado[12:]
    
    try:
        datos_descifrados = aesgcm.decrypt(nonce, datos_cifrados, None)
    except Exception as e:
        raise ValueError(f"Fallo al descifrar el embedding (clave incorrecta o datos corruptos): {e}")
    
    # Deserializar con struct (esperamos 512 floats)
    import struct
    # calcular cuántos floats hay
    num_floats = len(datos_descifrados) // struct.calcsize('f')
    formato = f'<{num_floats}f'
    
    vector = list(struct.unpack(formato, datos_descifrados))
    return vector
