# 💻 Kira — Dashboard (React + Vite)

Interfaz gráfica web para administrar el sistema Kira. Provee vistas diferentes según el rol de usuario (Administrador, Profesor, Alumno).

## Tecnologías Principales

- **React 18** y **Vite** para desarrollo y construcción ultrarrápida.
- **TypeScript** para seguridad de tipos y mayor robustez.
- **Tailwind CSS** para estilos ágiles o CSS puro usando variables de tema (soporte nativo de Dark Mode).
- **React Router** para navegación SPA (Single Page Application).
- **Axios** para comunicación con la API (Server 3).

## Características

- **Diseño Responsivo y Temas**: Soporte para Modo Oscuro y paleta de colores adaptable vía variables CSS (`index.css`).
- **Autenticación Segura**: Interceptores de Axios para inyectar y manejar expiración de tokens JWT.
- **Gestión de Usuarios**: Registro de alumnos desde webcam con guía visual y validación antes de envío al Server 1.
- **Monitoreo de Alertas**: Panel de control para que los administradores verifiquen alertas de deserción temprana o cambios emocionales bruscos.
- **Panel de Asistencia**: Interfaz de tablas detalladas para ver retrasos, asistencias y ausencias de forma filtrada.

## Desarrollo Local

Si deseas modificar la UI sin utilizar Docker, necesitas Node.js instalado (v18+).

```bash
cd server3-bd/dashboard
npm install
npm run dev
```

El dashboard requerirá que la API de Gestión (`server3-bd/api-gestion`) esté corriendo localmente en el puerto `8003`. Para esto, asegúrate de tener el `.env` (o `.env.local`) de la UI con la variable:
`VITE_API_URL=http://localhost:8003`

## Despliegue en Producción

El dashboard se compila utilizando `npm run build` y se sirve a través de un servidor Nginx contenido en la imagen oficial del dashboard definida en el `docker-compose.yml`. Nginx también funciona como proxy reverso para enrutar las peticiones `/api/*` hacia el contenedor de la API de Gestión.
