const API_BASE = '/api';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Función base para hacer fetch sin autenticación
 */
export async function api(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  return fetch(url, config);
}

/**
 * Función para hacer fetch con el token JWT inyectado
 */
export async function authFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const token = sessionStorage.getItem('kira_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // Si el token expiró o es inválido, cerramos sesión
  if (response.status === 401) {
    sessionStorage.removeItem('kira_token');
    sessionStorage.removeItem('kira_role');
    window.location.href = '/login'; // Redirigir al login
  }

  return response;
}

/**
 * Utilidad genérica para peticiones al Server 1 (Face Recognition)
 */
export async function apiServer1(url: string, options: FetchOptions = {}): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}
