/* ============================================================
   KIRA UAS — Dashboard Application (Vanilla JS)
   ============================================================ */

// ── Configuration ───────────────────────────────────────────
const API_BASE = window.location.origin;  // Server3
const SERVER1_URL = localStorage.getItem('server1_url') || 'http://192.168.100.95:8001';

// ── Theme Management ─────────────────────────────────────────
function initTheme() {
    const savedTheme = localStorage.getItem('kira_theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        updateThemeIcon('light');
    } else {
        updateThemeIcon('dark');
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.contains('light-theme');
    if (isLight) {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('kira_theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('kira_theme', 'light');
        updateThemeIcon('light');
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    if (theme === 'light') {
        // Moon icon for switching to dark
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        // Sun icon for switching to light
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
}

// Apply theme immediately
initTheme();

// ── Auth (session token) ────────────────────────────────────
// Token stored in sessionStorage — cleared automatically on tab/browser close
function getToken() {
    return sessionStorage.getItem('kira_token');
}

function setToken(token) {
    sessionStorage.setItem('kira_token', token);
}

function clearToken() {
    sessionStorage.removeItem('kira_token');
}

function getRole() {
    return sessionStorage.getItem('kira_role') || 'admin';
}

function setRole(role) {
    sessionStorage.setItem('kira_role', role);
}

function clearRole() {
    sessionStorage.removeItem('kira_role');
}

/**
 * Auth-aware fetch — auth guard for every protected request.
 * Automatically injects Authorization: Bearer header.
 * If the server returns 401, throws the user back to the login screen.
 */
async function authFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (resp.status === 401) {
        // Token expired or invalid — force re-login
        clearToken();
        showLoginScreen();
        throw new Error('Sesión expirada. Por favor vuelve a iniciar sesión.');
    }
    return resp;
}

// ── Auth Guard — init on page load ──────────────────────────
async function init() {
    const token = getToken();
    if (!token) {
        showLoginScreen();
        return;
    }
    // Validate token with the server
    try {
        const resp = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Token inválido');
        const user = await resp.json();
        setRole(user.role || 'admin');
        showDashboard(user);
    } catch {
        clearToken();
        clearRole();
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    document.getElementById('login-email').focus();
}

function applySidebarRole(role) {
    // Show/hide sidebar items based on role
    document.querySelectorAll('[data-role]').forEach(el => {
        const itemRole = el.dataset.role;
        if (itemRole === role || role === 'admin') {
            // Admin ve los items de admin; profesor ve los de profesor; alumno ve los de alumno
            // But each role ONLY sees its own items
            if (role === 'admin') {
                el.style.display = itemRole === 'admin' ? '' : 'none';
            } else {
                el.style.display = itemRole === role ? '' : 'none';
            }
        } else {
            el.style.display = 'none';
        }
    });
    // Items without data-role are always visible (like Inicio)
}

function showDashboard(user) {
    const role = user.role || getRole();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
    document.getElementById('admin-name').textContent = user.nombre;

    // Role badge
    const roleBadge = document.getElementById('admin-role-badge');
    if (roleBadge) {
        const labels = { admin: 'Admin', profesor: 'Profesor', alumno: 'Alumno' };
        roleBadge.textContent = labels[role] || role;
    }

    applySidebarRole(role);

    // Navigate to initial page based on role
    if (role === 'profesor') {
        navigateTo('profesor-grupos');
    } else if (role === 'alumno') {
        navigateTo('alumno-clases');
    } else {
        cargarInicio();
    }
}

// ── Login form handler ───────────────────────────────────
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
        const resp = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await resp.json();

        if (resp.ok) {
            setToken(data.access_token);
            setRole(data.role || 'admin');
            showDashboard({ nombre: data.nombre, role: data.role || 'admin' });
        } else {
            errorEl.textContent = data.detail || 'Credenciales incorrectas';
            errorEl.style.display = 'block';
        }
    } catch {
        errorEl.textContent = 'Error de conexión con el servidor';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Iniciar sesión';
    }
}

function logout() {
    if (!confirm('¿Cerrar sesión?')) return;
    clearToken();
    clearRole();
    showLoginScreen();
}

function togglePassword() {
    const input = document.getElementById('login-password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// ── State ─────────────────────────────────────────────────
let chartAsistencia = null;
let chartEmociones = null;
let chartTendencia = null;
let currentPage = 'inicio';

// ── Navigation ───────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
    });
});

// Auto-close sidebar on mobile when clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !e.target.closest('.sidebar-toggle') && !e.target.closest('.sidebar-close-btn')) {
                sidebar.classList.remove('open');
            }
        }
    }
});

function navigateTo(page) {
    currentPage = page;

    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    // Show page
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');

    // Auto-close sidebar on mobile
    if (window.innerWidth <= 900) {
        document.getElementById('sidebar')?.classList.remove('open');
    }

    // Load data
    const loaders = {
        inicio: cargarInicio,
        usuarios: cargarUsuarios,
        materias: cargarMaterias,
        grupos: cargarGrupos,
        horarios: () => { cargarGruposSelect('horario-grupo-select'); },
        inscripciones: () => { cargarAlumnosSelectInscripciones(); },
        asistencia: () => { cargarGruposSelect('asistencia-grupo-select'); },
        'lista-asistencia': () => { cargarGruposSelect('lista-asistencia-grupo-select'); },
        emociones: cargarEmocionesGrafica,
        admins: cargarAdmins,
        // PROFESOR
        'profesor-grupos': cargarProfesorGrupos,
        'profesor-asistencia': cargarProfesorGruposSelect,
        'profesor-emociones': cargarProfesorEmociones,
        // ALUMNO
        'alumno-clases': cargarAlumnoClases,
        'alumno-asistencia': cargarAlumnoAsistenciaInit,
    };
    if (loaders[page]) loaders[page]();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
        if (mainContent) mainContent.classList.toggle('expanded');
    }
}

// ── API Helpers ───────────────────────────────────────────
async function api(path, options = {}) {
    try {
        const resp = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
        return await resp.json();
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

async function apiServer1(path, options = {}) {
    try {
        const resp = await fetch(`${SERVER1_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
        return await resp.json();
    } catch (e) {
        console.error('Server1 API Error:', e);
        return null;
    }
}

// ── Modal ─────────────────────────────────────────────────
function abrirModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    document.getElementById('modal-overlay').classList.add('active');
}

function cerrarModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    // Stop camera if active
    const video = document.querySelector('#modal-body video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
    }
}

// Close on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModal();
});

function showAlert(container, type, message) {
    const icons = {
        success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        danger:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        info:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    };
    const el = document.getElementById(container) || document.getElementById('modal-body');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `${icons[type] || ''} ${message}`;
    el.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}

// ============================================================
//  INICIO / DASHBOARD
// ============================================================

async function cargarInicio() {
    const resumen = await api('/api/dashboard/resumen');
    if (resumen) {
        document.getElementById('stat-alumnos').textContent = resumen.total_alumnos;
        document.getElementById('stat-profesores').textContent = resumen.total_profesores;
        document.getElementById('stat-grupos').textContent = resumen.total_grupos;
        document.getElementById('stat-materias').textContent = resumen.total_materias;
        document.getElementById('stat-embeddings').textContent = resumen.embeddings_registrados;
        document.getElementById('stat-asistencias-hoy').textContent = resumen.asistencias_hoy;
    }

    // Chart: Asistencia semanal
    const semanal = await api('/api/dashboard/asistencia-semanal');
    if (semanal) {
        const ctx = document.getElementById('chart-asistencia-semanal').getContext('2d');
        if (chartAsistencia) chartAsistencia.destroy();
        chartAsistencia = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: semanal.map(d => d.dia),
                datasets: [{
                    label: 'Asistencias',
                    data: semanal.map(d => d.cantidad),
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return '#3b82f6';
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, '#8b5cf6');
                        gradient.addColorStop(1, '#0ea5e9');
                        return gradient;
                    },
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, border: { display: false }, ticks: { color: '#64748b', padding: 10, font: { size: 14 } }, grid: { color: '#1e2843', drawTicks: false } },
                    x: { border: { display: false }, ticks: { color: '#94a3b8', padding: 10, font: { size: 14 } }, grid: { display: false, drawTicks: false } }
                }
            }
        });
    }

    // Chart: Emociones
    const emociones = await api('/api/dashboard/emociones?dias=7');
    if (emociones && emociones.datos) {
        const ctx = document.getElementById('chart-emociones').getContext('2d');
        if (chartEmociones) chartEmociones.destroy();

        const colorMap = { positivo: '#10b981', neutro: '#3b82f6', negativo: '#ef4444' };
        chartEmociones = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: emociones.datos.map(d => d.emocion.charAt(0).toUpperCase() + d.emocion.slice(1)),
                datasets: [{
                    data: emociones.datos.map(d => d.cantidad),
                    backgroundColor: emociones.datos.map(d => colorMap[d.emocion] || '#64748b'),
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            padding: 24,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 15 }
                        }
                    }
                }
            }
        });
    }
}

// ============================================================
//  USUARIOS
// ============================================================

async function cargarUsuarios() {
    const filtro = document.getElementById('filtro-tipo-usuario').value;
    const queryParam = filtro ? `?tipo=${filtro}` : '';
    const usuarios = await api(`/api/usuarios${queryParam}`);
    const tbody = document.getElementById('tabla-usuarios');

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No hay usuarios registrados</p></td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
                    ${u.foto_perfil ? `<img src="${u.foto_perfil}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                    <span>${u.nombre} ${u.apellido}</span>
                </div>
            </td>
            <td><code>${u.matricula}</code></td>
            <td><span class="badge ${u.tipo === 'alumno' ? 'badge-info' : 'badge-purple'}">${u.tipo}</span></td>
            <td>${u.tiene_embedding ? '<span class="badge badge-success">Listo</span>' : '<span class="badge badge-warning">Pendiente</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="abrirModalCapturaCara('${u.matricula}', '${u.nombre} ${u.apellido}')">Registrar Cara</button>
                <button class="btn btn-sm btn-outline" onclick="abrirModalSetEmail(${u.id}, '${u.nombre} ${u.apellido}', '${u.email || ''}')" title="Editar correo"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></button>
                <button class="btn btn-sm btn-outline" onclick="abrirModalSetPassword(${u.id}, '${u.nombre} ${u.apellido}', '${u.email || ''}')" title="Asignar contraseña"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></button>
                <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${u.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button>
            </td>
        </tr>
    `).join('');
}

function abrirModalUsuario() {
    const body = `
        <div id="modal-alert-zone"></div>
        <div class="form-row">
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" class="form-control" id="usr-nombre" placeholder="Juan">
            </div>
            <div class="form-group">
                <label>Apellido</label>
                <input type="text" class="form-control" id="usr-apellido" placeholder="Pérez">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Matrícula / Num. Empleado</label>
                <input type="text" class="form-control" id="usr-matricula" placeholder="123456">
            </div>
            <div class="form-group">
                <label>Tipo</label>
                <select class="form-control" id="usr-tipo">
                    <option value="alumno">Alumno</option>
                    <option value="profesor">Profesor</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Foto de Perfil</label>
            <input type="file" class="form-control" id="usr-foto" accept="image/*">
        </div>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarUsuario()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Registrar</button>
    `;
    abrirModal('Nuevo Usuario', body, footer);
}

async function guardarUsuario() {
    const nombre = document.getElementById('usr-nombre').value.trim();
    const apellido = document.getElementById('usr-apellido').value.trim();
    const matricula = document.getElementById('usr-matricula').value.trim();
    const tipo = document.getElementById('usr-tipo').value;
    const fotoInput = document.getElementById('usr-foto');

    if (!nombre || !apellido || !matricula || !fotoInput.files[0]) {
        showAlert('modal-alert-zone', 'danger', 'Todos los campos son obligatorios');
        return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('apellido', apellido);
    formData.append('matricula', matricula);
    formData.append('tipo', tipo);
    formData.append('foto', fotoInput.files[0]);

    try {
        const resp = await fetch(`${API_BASE}/api/usuarios/registrar`, {
            method: 'POST',
            body: formData,  // No Content-Type header for multipart
        });
        const data = await resp.json();

        if (resp.ok) {
            cerrarModal();
            cargarUsuarios();
        } else {
            showAlert('modal-alert-zone', 'danger', data.detail || 'Error al registrar');
        }
    } catch (e) {
        showAlert('modal-alert-zone', 'danger', 'Error de conexión');
    }
}

async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    await api(`/api/usuarios/${id}`, { method: 'DELETE' });
    cargarUsuarios();
}

// ── Captura de Cara (Registro Facial) ────────────────────
function abrirModalCapturaCara(matricula, nombreCompleto) {
    const body = `
        <div id="modal-alert-zone"></div>
        <p style="margin-bottom:12px;color:var(--text-secondary);">
            Registrando cara para <strong>${nombreCompleto}</strong> (${matricula})
        </p>
        <div class="camera-container">
            <div class="camera-preview" id="camera-preview">
                <div class="placeholder">Vista previa</div>
            </div>
            <div class="camera-actions">
                <button class="btn btn-outline" onclick="iniciarCamara()">Usar Cámara</button>
                <button class="btn btn-outline" onclick="document.getElementById('file-upload-cara').click()">Subir Imagen</button>
                <input type="file" id="file-upload-cara" accept="image/*" style="display:none" onchange="cargarImagenCara(event)">
                <button class="btn btn-primary hidden" id="btn-capturar" onclick="capturarFoto()">Tomar Fotografía</button>
            </div>
        </div>
        <input type="hidden" id="cara-matricula" value="${matricula}">
        <canvas id="canvas-captura" style="display:none;"></canvas>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-enviar-cara" onclick="enviarCara()" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Registrar Cara</button>
    `;
    abrirModal('Registro Facial', body, footer);
}

let capturedBase64 = null;

async function iniciarCamara() {
    // Verificar que la API existe (requiere HTTPS o localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const esHTTP = location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
        if (esHTTP) {
            showAlert('modal-alert-zone', 'danger',
                'La cámara requiere acceder por <strong>localhost</strong> o HTTPS. ' +
                'Abre el dashboard en <code>http://localhost:8003/dashboard</code> en lugar de por IP.');
        } else {
            showAlert('modal-alert-zone', 'danger', 'Tu navegador no soporta acceso a la cámara.');
        }
        return;
    }

    try {
        // Solicitar permiso explícitamente
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        const preview = document.getElementById('camera-preview');
        preview.innerHTML = '<video autoplay playsinline muted></video>';
        const video = preview.querySelector('video');
        video.srcObject = stream;
        await video.play();
        document.getElementById('btn-capturar').classList.remove('hidden');

    } catch (e) {
        console.error('getUserMedia error:', e.name, e.message);

        let msg = 'No se pudo acceder a la cámara.';
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            msg = 'Permiso de cámara denegado. Haz clic en el ícono de cámara en la barra de dirección ' +
                'del navegador y selecciona <strong>"Permitir"</strong>, luego vuelve a intentarlo.';
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            msg = 'No se encontró ninguna cámara. Conecta una webcam y vuelve a intentarlo.';
        } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
            msg = 'La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentarlo.';
        } else if (e.name === 'OverconstrainedError') {
            // Reintentar sin restricciones de resolución
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const preview = document.getElementById('camera-preview');
                preview.innerHTML = '<video autoplay playsinline muted></video>';
                preview.querySelector('video').srcObject = stream;
                document.getElementById('btn-capturar').classList.remove('hidden');
                return;
            } catch (e2) {
                msg = 'No se pudo iniciar la cámara con los parámetros requeridos.';
            }
        }
        showAlert('modal-alert-zone', 'danger', msg);
    }
}

function capturarFoto() {
    const video = document.querySelector('#camera-preview video');
    if (!video) return;

    const canvas = document.getElementById('canvas-captura');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Stop camera
    video.srcObject.getTracks().forEach(t => t.stop());

    // Show captured image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    document.getElementById('camera-preview').innerHTML = `<img src="${dataUrl}">`;
    document.getElementById('btn-capturar').classList.add('hidden');

    // Store base64 (without prefix)
    capturedBase64 = dataUrl.split(',')[1];
    document.getElementById('btn-enviar-cara').disabled = false;
}

function cargarImagenCara(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        document.getElementById('camera-preview').innerHTML = `<img src="${dataUrl}">`;
        capturedBase64 = dataUrl.split(',')[1];
        document.getElementById('btn-enviar-cara').disabled = false;
    };
    reader.readAsDataURL(file);
}

async function enviarCara() {
    if (!capturedBase64) return;

    const matricula = document.getElementById('cara-matricula').value;
    const btn = document.getElementById('btn-enviar-cara');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const result = await api('/api/proxy/registrar-cara', {
        method: 'POST',
        body: JSON.stringify({ matricula, foto_base64: capturedBase64 }),
    });

    if (result && result.status === 'success') {
        showAlert('modal-alert-zone', 'success', '¡Cara registrada correctamente!');
        setTimeout(() => { cerrarModal(); cargarUsuarios(); }, 1500);
    } else {
        const msg = result?.mensaje || 'Error al procesar. ¿Server1 está corriendo?';
        showAlert('modal-alert-zone', 'danger', msg);
        btn.disabled = false;
        btn.textContent = 'Registrar Cara';
    }

    capturedBase64 = null;
}

// ============================================================
//  MATERIAS
// ============================================================

async function cargarMaterias() {
    const materias = await api('/api/materias');
    const tbody = document.getElementById('tabla-materias');

    if (!materias || materias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><p>No hay materias registradas</p></td></tr>';
        return;
    }

    tbody.innerHTML = materias.map(m => `
        <tr>
            <td>${m.id}</td>
            <td>${m.nombre}</td>
            <td><code>${m.clave}</code></td>
        </tr>
    `).join('');
}

function abrirModalMateria() {
    const body = `
        <div id="modal-alert-zone"></div>
        <div class="form-group">
            <label>Nombre de la Materia</label>
            <input type="text" class="form-control" id="mat-nombre" placeholder="Inteligencia Artificial">
        </div>
        <div class="form-group">
            <label>Clave</label>
            <input type="text" class="form-control" id="mat-clave" placeholder="IA-401">
        </div>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarMateria()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Registrar</button>
    `;
    abrirModal('Nueva Materia', body, footer);
}

async function guardarMateria() {
    const nombre = document.getElementById('mat-nombre').value.trim();
    const clave = document.getElementById('mat-clave').value.trim();
    if (!nombre || !clave) {
        showAlert('modal-alert-zone', 'danger', 'Todos los campos son obligatorios');
        return;
    }
    const result = await api('/api/materias/registrar', {
        method: 'POST',
        body: JSON.stringify({ nombre, clave }),
    });
    if (result && result.materia_id) {
        cerrarModal();
        cargarMaterias();
    } else {
        showAlert('modal-alert-zone', 'danger', result?.detail || 'Error al registrar materia');
    }
}

// ============================================================
//  GRUPOS
// ============================================================

async function cargarGrupos() {
    const grupos = await api('/api/grupos');
    const tbody = document.getElementById('tabla-grupos');

    if (!grupos || grupos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No hay grupos registrados</p></td></tr>';
        return;
    }

    tbody.innerHTML = grupos.map(g => `
        <tr>
            <td>${g.id}</td>
            <td>${g.materia_nombre}</td>
            <td>${g.profesor_nombre}</td>
            <td>${g.aula}</td>
            <td>${g.semestre}</td>
            <td>${g.periodo}</td>
            <td><span class="badge badge-info">${g.num_alumnos}</span></td>
        </tr>
    `).join('');
}

async function abrirModalGrupo() {
    // Load materias and profesores for selects
    const materias = await api('/api/materias');
    const profesores = await api('/api/usuarios?tipo=profesor');

    const materiasOptions = (materias || []).map(m =>
        `<option value="${m.id}">${m.nombre} (${m.clave})</option>`
    ).join('');

    const profesoresOptions = (profesores || []).map(p =>
        `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`
    ).join('');

    const body = `
        <div id="modal-alert-zone"></div>
        <div class="form-group">
            <label>ID del Grupo (opcional, se auto-genera si se deja vacío)</label>
            <input type="number" class="form-control" id="grp-id" placeholder="Ej: 5">
        </div>
        <div class="form-group">
            <label>Materia</label>
            <select class="form-control" id="grp-materia">${materiasOptions || '<option>No hay materias</option>'}</select>
        </div>
        <div class="form-group">
            <label>Profesor</label>
            <select class="form-control" id="grp-profesor">${profesoresOptions || '<option>No hay profesores</option>'}</select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Aula</label>
                <input type="text" class="form-control" id="grp-aula" placeholder="A-201">
            </div>
            <div class="form-group">
                <label>Semestre</label>
                <input type="text" class="form-control" id="grp-semestre" placeholder="8vo">
            </div>
        </div>
        <div class="form-group">
            <label>Periodo</label>
            <input type="text" class="form-control" id="grp-periodo" placeholder="2026-1">
        </div>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarGrupo()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Registrar</button>
    `;
    abrirModal('Nuevo Grupo', body, footer);
}

async function guardarGrupo() {
    const idVal = document.getElementById('grp-id').value;
    const payload = {
        materia_id: parseInt(document.getElementById('grp-materia').value),
        profesor_id: parseInt(document.getElementById('grp-profesor').value),
        aula: document.getElementById('grp-aula').value.trim(),
        semestre: document.getElementById('grp-semestre').value.trim(),
        periodo: document.getElementById('grp-periodo').value.trim(),
    };
    if (idVal) payload.id = parseInt(idVal);

    if (!payload.aula || !payload.semestre || !payload.periodo) {
        showAlert('modal-alert-zone', 'danger', 'Todos los campos son obligatorios');
        return;
    }

    const result = await api('/api/grupos/registrar', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (result && result.grupo_id) {
        cerrarModal();
        cargarGrupos();
    } else {
        showAlert('modal-alert-zone', 'danger', result?.detail || 'Error al registrar grupo');
    }
}

// ── Shared: Load grupo selects ───────────────────────────
async function cargarGruposSelect(selectId) {
    const grupos = await api('/api/grupos');
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona un grupo --</option>' +
        (grupos || []).map(g =>
            `<option value="${g.id}">${g.materia_nombre} — ${g.profesor_nombre} (${g.aula})</option>`
        ).join('');
}

// ============================================================
//  HORARIOS
// ============================================================

async function cargarHorarios() {
    const grupoId = document.getElementById('horario-grupo-select').value;
    const tbody = document.getElementById('tabla-horarios');
    if (!grupoId) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Selecciona un grupo</p></td></tr>';
        return;
    }

    const horarios = await api(`/api/horarios/${grupoId}`);
    if (!horarios || horarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Sin horarios asignados</p></td></tr>';
        return;
    }

    tbody.innerHTML = horarios.map(h => `
        <tr>
            <td>${h.id}</td>
            <td>${h.dia_nombre}</td>
            <td>${h.hora_inicio}</td>
            <td>${h.hora_fin}</td>
            <td>${h.tolerancia_minutos} min</td>
            <td><button class="btn btn-sm btn-danger" onclick="eliminarHorario(${h.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button></td>
        </tr>
    `).join('');
}

function abrirModalHorario() {
    const grupoId = document.getElementById('horario-grupo-select').value;
    if (!grupoId) {
        alert('Primero selecciona un grupo');
        return;
    }

    const body = `
        <div id="modal-alert-zone"></div>
        <input type="hidden" id="hor-grupo" value="${grupoId}">
        <div class="form-group">
            <label>Día de la Semana</label>
            <select class="form-control" id="hor-dia">
                <option value="0">Lunes</option>
                <option value="1">Martes</option>
                <option value="2">Miércoles</option>
                <option value="3">Jueves</option>
                <option value="4">Viernes</option>
                <option value="5">Sábado</option>
            </select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Hora Inicio</label>
                <input type="time" class="form-control" id="hor-inicio" value="08:00">
            </div>
            <div class="form-group">
                <label>Hora Fin</label>
                <input type="time" class="form-control" id="hor-fin" value="10:00">
            </div>
        </div>
        <div class="form-group">
            <label>Tolerancia (minutos)</label>
            <input type="number" class="form-control" id="hor-tolerancia" value="10" min="0" max="60">
        </div>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarHorario()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Registrar</button>
    `;
    abrirModal('Nuevo Horario', body, footer);
}

async function guardarHorario() {
    const payload = {
        grupo_id: parseInt(document.getElementById('hor-grupo').value),
        dia_semana: parseInt(document.getElementById('hor-dia').value),
        hora_inicio: document.getElementById('hor-inicio').value,
        hora_fin: document.getElementById('hor-fin').value,
        tolerancia_minutos: parseInt(document.getElementById('hor-tolerancia').value),
    };

    const result = await api('/api/horarios/registrar', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (result && result.horario_id) {
        cerrarModal();
        cargarHorarios();
    } else {
        showAlert('modal-alert-zone', 'danger', result?.detail || 'Error');
    }
}

async function eliminarHorario(id) {
    if (!confirm('¿Eliminar este horario?')) return;
    await api(`/api/horarios/${id}`, { method: 'DELETE' });
    cargarHorarios();
}

// ============================================================
//  INSCRIPCIONES — Nuevo flujo: Alumno → Catálogo de clases
// ============================================================

async function cargarAlumnosSelectInscripciones() {
    const alumnos = await api('/api/usuarios?tipo=alumno') || [];
    const select = document.getElementById('inscripcion-alumno-select');
    if (!select) return;
    const prev = select.value;
    select.innerHTML = '<option value="">— Selecciona un alumno —</option>' +
        alumnos.map(a =>
            `<option value="${a.id}">${a.nombre} ${a.apellido} — ${a.matricula}</option>`
        ).join('');
    if (prev) select.value = prev;
}

async function cargarClasesAlumno() {
    const alumnoId = document.getElementById('inscripcion-alumno-select').value;
    const grid = document.getElementById('clases-grid');
    const empty = document.getElementById('inscripciones-empty');

    if (!alumnoId) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        empty.innerHTML = '<p>Selecciona un alumno para ver las clases disponibles</p>';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = 'none';
    grid.innerHTML = '<div class="clase-card-loading">Cargando clases...</div>';
    grid.style.display = 'grid';

    const grupos = await api(`/api/grupos/con-horarios?alumno_id=${alumnoId}`);

    if (!grupos || grupos.length === 0) {
        grid.innerHTML = '';
        empty.innerHTML = '<p>No hay grupos registrados en el sistema</p>';
        empty.style.display = 'block';
        grid.style.display = 'none';
        return;
    }

    grid.innerHTML = grupos.map(g => renderClaseCard(g, alumnoId)).join('');
}

function renderClaseCard(g, alumnoId) {
    const cardId = `clase-card-${g.id}`;
    const hasHorarios = g.horarios && g.horarios.length > 0;

    // Find first unenrolled schedule to auto-select
    let firstUnenrolledIdx = -1;
    if (hasHorarios) {
        firstUnenrolledIdx = g.horarios.findIndex(h => !h.alumno_inscrito);
    }
    const autoSelectIdx = (g.horarios.length === 1 && firstUnenrolledIdx === 0) ? 0 : -1;

    let horariosHTML = '';
    if (!hasHorarios) {
        horariosHTML = `
            <div class="horario-empty-notice"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Sin horario asignado — no se puede inscribir</div>
        `;
    } else {
        horariosHTML = g.horarios.map((h, idx) => {
            const inicio = h.hora_inicio.substring(0, 5);
            const fin = h.hora_fin.substring(0, 5);

            if (h.alumno_inscrito) {
                // Enrolled
                return `
                    <div class="horario-option horario-option--enrolled" style="display:flex; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span class="horario-radio" title="Inscrito"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
                            <span class="horario-dia">${h.dia_nombre}</span>
                            <span class="horario-tiempo horario-tiempo--enrolled">${inicio} – ${fin}</span>
                        </div>
                        <button class="btn btn-sm btn-danger py-0 px-2" style="font-size:0.75rem;" onclick="desinscribirAlumno(${h.inscripcion_id}, ${alumnoId})" title="Dar de baja de este horario">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                        </button>
                    </div>
                `;
            } else {
                // Not enrolled: interactive radio selection
                const selected = idx === autoSelectIdx;
                return `
                    <div class="horario-option ${selected ? 'horario-option--selected' : ''}"
                         onclick="seleccionarHorario('${cardId}', ${idx}, ${g.id}, ${h.id}, ${alumnoId})"
                         data-horario-idx="${idx}"
                         title="Selecciona este horario">
                        <span class="horario-radio">${selected ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="#0ea5e9"></circle></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>'}</span>
                        <span class="horario-dia">${h.dia_nombre}</span>
                        <span class="horario-tiempo">${inicio} – ${fin}</span>
                    </div>
                `;
            }
        }).join('');
    }

    const hasUnenrolled = hasHorarios && firstUnenrolledIdx !== -1;
    const isFullyEnrolled = hasHorarios && firstUnenrolledIdx === -1;
    const isPartiallyEnrolled = hasHorarios && g.horarios.some(h => h.alumno_inscrito);

    let btnInscribir = '';
    if (hasHorarios) {
        if (isFullyEnrolled) {
            btnInscribir = `<button class="btn btn-sm btn-success" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Inscrito en todos los horarios</button>`;
        } else {
            const defaultH = autoSelectIdx >= 0 ? g.horarios[autoSelectIdx] : null;
            const btnLabel = defaultH
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Inscribir — ${defaultH.dia_nombre} ${defaultH.hora_inicio.substring(0, 5)}`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Selecciona un horario`;

            const btnDisabled = autoSelectIdx >= 0 ? '' : 'disabled';
            const onclickParam = defaultH ? `onclick="inscribirAlumno(${g.id}, ${defaultH.id}, ${alumnoId})"` : '';

            btnInscribir = `<button class="btn btn-sm btn-primary btn-inscribir-grupo"
                   id="btn-inscribir-${g.id}"
                   ${btnDisabled}
                   ${onclickParam}>
                   ${btnLabel}
               </button>`;
        }
    }

    const horariosTituloHTML = isPartiallyEnrolled
        ? `<div class="clase-horarios-title enrolled-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Selecciona horarios adicionales</div>`
        : `<div class="clase-horarios-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Selecciona el horario</div>`;

    return `
        <div class="clase-card ${isPartiallyEnrolled ? 'clase-card--inscrito' : ''}" id="${cardId}">
            <div class="clase-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="clase-materia">${g.materia_nombre}</div>
                    <code class="clase-clave" style="margin-top:0;">${g.materia_clave}</code>
                </div>
                ${isFullyEnrolled ? '<span class="badge badge-success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Completamente inscrito</span>' : isPartiallyEnrolled ? '<span class="badge badge-success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Inscrito</span>' : ''}
            </div>
            <div class="clase-info">
                <span>Profesor: ${g.profesor_nombre}</span>
                <span>Aula: ${g.aula}</span>
                <span>Semestre: ${g.semestre} — ${g.periodo}</span>
                <span style="color:var(--info); font-weight:600;">Total de Alumnos: ${g.num_alumnos}</span>
            </div>
            <div class="clase-horarios-lista">
                ${horariosTituloHTML}
                ${horariosHTML}
            </div>
            <div class="clase-card-footer">${btnInscribir}</div>
        </div>
    `;
}


function seleccionarHorario(cardId, idx, grupoId, horarioId, alumnoId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    // Deselect all options in this card
    card.querySelectorAll('.horario-option:not(.horario-option--enrolled)').forEach(el => {
        el.classList.remove('horario-option--selected');
        el.querySelector('.horario-radio').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
    });

    // Select the clicked option
    const selected = card.querySelector(`.horario-option[data-horario-idx="${idx}"]`);
    if (selected) {
        selected.classList.add('horario-option--selected');
        selected.querySelector('.horario-radio').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="#0ea5e9"></circle></svg>';
    }

    // Update the Inscribir button
    const btn = document.getElementById(`btn-inscribir-${grupoId}`);
    if (btn) {
        const dia = selected?.querySelector('.horario-dia')?.textContent || '';
        const tiempo = selected?.querySelector('.horario-tiempo')?.textContent || '';
        btn.textContent = `Inscribir — ${dia} ${tiempo.split(' –')[0]}`;
        btn.disabled = false;
        btn.onclick = () => inscribirAlumno(grupoId, horarioId, alumnoId);
    }
}


async function inscribirAlumno(grupoId, horarioId, alumnoId) {
    const result = await api('/api/inscripciones/registrar', {
        method: 'POST',
        body: JSON.stringify({ alumno_id: parseInt(alumnoId), grupo_id: parseInt(grupoId), horario_id: parseInt(horarioId) }),
    });
    if (result && result.inscripcion_id) {
        cargarClasesAlumno();
    } else {
        alert(result?.detail || 'Error al inscribir al alumno');
    }
}

async function desinscribirAlumno(inscripcionId, alumnoId) {
    if (!confirm('¿Dar de baja al alumno de esta clase?')) return;
    const result = await api(`/api/inscripciones/${inscripcionId}`, { method: 'DELETE' });
    if (result) {
        cargarClasesAlumno();
    } else {
        alert('Error al eliminar la inscripción');
    }
}



// ============================================================
//  ASISTENCIA
// ============================================================

async function cargarAsistencia() {
    const grupoId = document.getElementById('asistencia-grupo-select').value;
    const fecha = document.getElementById('asistencia-fecha').value;
    const tbody = document.getElementById('tabla-asistencia');

    if (!grupoId) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Selecciona un grupo</p></td></tr>';
        return;
    }

    let url = `/api/asistencia/${grupoId}`;
    if (fecha) url += `?fecha=${fecha}`;

    const registros = await api(url);
    if (!registros || registros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Sin registros de asistencia</p></td></tr>';
        return;
    }

    const estadoBadge = (estado) => {
        const map = {
            a_tiempo: 'badge-success',
            retardo: 'badge-warning',
            fuera_de_horario: 'badge-danger',
            ausente: 'badge-danger',
        };
        const labels = {
            a_tiempo: 'A tiempo',
            retardo: 'Retardo',
            fuera_de_horario: 'Fuera de horario',
            ausente: 'Ausente',
        };
        return `<span class="badge ${map[estado] || 'badge-info'}">${labels[estado] || estado}</span>`;
    };

    const emocionBadge = (emocion) => {
        const map = { positivo: 'badge-success', neutro: 'badge-purple', negativo: 'badge-danger' };
        return `<span class="badge ${map[emocion] || 'badge-info'}">${emocion || '—'}</span>`;
    };

    tbody.innerHTML = registros.map(r => `
        <tr>
            <td>${r.nombre}</td>
            <td><code>${r.matricula}</code></td>
            <td>${r.fecha}</td>
            <td>${r.hora_registro}</td>
            <td>${estadoBadge(r.estado)}</td>
            <td>${emocionBadge(r.emocion)}</td>
        </tr>
    `).join('');
}


// ============================================================
//  LISTA DE ASISTENCIA
// ============================================================

async function cargarListaAsistencia() {
    const grupoId = document.getElementById('lista-asistencia-grupo-select').value;
    const cont = document.getElementById('lista-asistencia-contenedor');
    const stats = document.getElementById('lista-asistencia-stats');

    if (!grupoId) {
        cont.innerHTML = '<div class="empty-state">Selecciona un grupo para ver la lista.</div>';
        stats.innerHTML = '';
        return;
    }

    // We could show a loading state
    cont.innerHTML = '<div class="empty-state">Cargando datos...</div>';
    stats.innerHTML = '';

    const data = await api(`/api/asistencia/grupo/${grupoId}/tabla`);
    if (!data || !data.dates) {
        cont.innerHTML = '<div class="empty-state">Error al cargar o sin registros</div>';
        return;
    }

    stats.innerHTML = `Total de días de clase (módulo impartido): ${data.total_class_days}`;

    const clsAsistencia = (estado) => {
        if (estado === 'ausente') return 'badge-danger';
        if (estado === 'fuera_de_horario') return 'badge-warning';
        if (estado === 'a_tiempo' || estado === 'justificado') return 'badge-success';
        if (estado === 'retardo') return 'badge-warning';
        return 'badge-info';
    };

    const mapLabels = {
        'a_tiempo': 'A tiempo',
        'retardo': 'Retardo',
        'ausente': 'Ausente',
        'fuera_de_horario': 'Fuera',
        'justificado': 'Justificado'
    };

    const isExcluido = (f) => data.excluded_dates.includes(f);

    let html = '<table><thead><tr>';
    html += '<th>Participante</th><th>Rol</th><th>Asistencias</th><th>Faltas</th>';

    for (const f of data.dates) {
        const excluido = isExcluido(f);
        const titleText = excluido ? `Día ${f} (Excluido)` : `Día ${f}`;
        const opacity = excluido ? 'opacity:0.6; text-decoration:line-through' : '';
        html += `<th>
            <div style="${opacity}" title="${titleText}">${f}</div>
            <button class="btn btn-sm btn-outline" style="font-size:10px; margin-top:4px;" onclick="excluirDia(${grupoId}, '${f}')">
                ${excluido ? 'Restaurar' : 'Pasar'}
            </button>
        </th>`;
    }
    html += '</tr></thead><tbody>';

    const drawRow = (u, tipo) => {
        if (!u) return '';
        let rowHtml = `<tr>
            <td style="white-space:nowrap;font-weight:500;">${u.nombre} ${u.apellido}</td>
            <td><span class="badge ${tipo === 'Profesor' ? 'badge-purple' : 'badge-info'}">${tipo}</span></td>
            <td><b>${u.total_asistencias}</b></td>
            <td><b>${u.total_faltas}</b></td>
        `;

        for (const f of data.dates) {
            const estado = u.asistencia_por_fecha[f] || 'ausente';
            const excluido = isExcluido(f);

            let btnJustificar = '';
            if ((estado === 'ausente' || estado === 'fuera_de_horario') && !excluido && tipo === 'Alumno') {
                btnJustificar = `<br><button class="btn btn-sm btn-primary" style="font-size:10px; margin-top:4px; padding:2px 4px;" onclick="justificarFalta(${u.id}, ${grupoId}, '${f}', '${u.nombre.replace(/'/g, "\\'")}')">Justificar</button>`;
            }

            const cellOpacity = excluido ? '0.4' : '1';
            rowHtml += `<td style="opacity: ${cellOpacity}">
                <span class="badge ${clsAsistencia(estado)}">${mapLabels[estado] || estado}</span>
                ${btnJustificar}
            </td>`;
        }
        rowHtml += '</tr>';
        return rowHtml;
    };

    html += drawRow(data.teacher, 'Profesor');
    for (const s of data.students) {
        html += drawRow(s, 'Alumno');
    }

    html += '</tbody></table>';
    cont.innerHTML = html;
}

async function excluirDia(grupoId, fecha) {
    if (!confirm(`¿Deseas excluir o restaurar el día ${fecha}? Un día excluido no cuenta para las asistencias de nadie.`)) return;
    const resp = await api(`/api/asistencia/grupo/${grupoId}/excluir_dia`, {
        method: 'POST',
        body: JSON.stringify({ fecha })
    });
    if (resp) {
        cargarListaAsistencia();
    }
}

async function justificarFalta(usuarioId, grupoId, fecha, nombre) {
    if (!confirm(`¿Justificar falta de ${nombre} el día ${fecha}?`)) return;
    const resp = await api(`/api/asistencia/justificar`, {
        method: 'POST',
        body: JSON.stringify({ usuario_id: usuarioId, grupo_id: grupoId, fecha })
    });
    if (resp) {
        cargarListaAsistencia();
    }
}


// ============================================================
//  EMOCIONES (GRÁFICAS)
// ============================================================

async function cargarEmocionesGrafica() {
    const dias = document.getElementById('emociones-dias')?.value || 30;
    const datos = await api(`/api/dashboard/emociones-tendencia?dias=${dias}`);

    const ctx = document.getElementById('chart-emociones-tendencia')?.getContext('2d');
    if (!ctx) return;

    if (chartTendencia) chartTendencia.destroy();

    if (!datos || datos.length === 0) {
        // Show empty state
        return;
    }

    chartTendencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datos.map(d => d.fecha),
            datasets: [
                {
                    label: 'Positivo',
                    data: datos.map(d => d.positivo),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Neutro',
                    data: datos.map(d => d.neutro),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Negativo',
                    data: datos.map(d => d.negativo),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', padding: 16 }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: '#1e2843' } },
                x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { display: false } }
            }
        }
    });
}

// ── Init (Auth Guard) ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    init();  // Checks session token → shows login or dashboard
});

// ============================================================
//  ADMINISTRADORES
// ============================================================

async function cargarAdmins() {
    const tbody = document.getElementById('tabla-admins');
    try {
        const resp = await authFetch('/api/admins');
        const admins = await resp.json();

        if (!admins || admins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No hay administradores registrados</p></td></tr>';
            return;
        }

        tbody.innerHTML = admins.map(a => `
            <tr>
                <td>${a.id}</td>
                <td>${a.nombre}</td>
                <td>${a.email}</td>
                <td>${a.fecha_registro || '—'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="eliminarAdmin(${a.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>Error al cargar: ${e.message}</p></td></tr>`;
    }
}

function abrirModalAdmin() {
    const body = `
        <div id="modal-alert-zone"></div>
        <div class="form-group">
            <label>Nombre completo</label>
            <input type="text" class="form-control" id="adm-nombre" placeholder="Ana García">
        </div>
        <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" class="form-control" id="adm-email" placeholder="ana@uas.edu.mx">
        </div>
        <div class="form-group">
            <label>Contraseña</label>
            <input type="password" class="form-control" id="adm-password" placeholder="Mínimo 8 caracteres">
        </div>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarAdmin()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Registrar</button>
    `;
    abrirModal('Nuevo Administrador', body, footer);
}

async function guardarAdmin() {
    const nombre = document.getElementById('adm-nombre').value.trim();
    const email = document.getElementById('adm-email').value.trim();
    const password = document.getElementById('adm-password').value;

    if (!nombre || !email || !password) {
        showAlert('modal-alert-zone', 'danger', 'Todos los campos son obligatorios');
        return;
    }
    if (password.length < 8) {
        showAlert('modal-alert-zone', 'danger', 'La contraseña debe tener al menos 8 caracteres');
        return;
    }

    try {
        const resp = await authFetch('/api/admins/registrar', {
            method: 'POST',
            body: JSON.stringify({ nombre, email, password }),
        });
        const data = await resp.json();

        if (resp.ok) {
            cerrarModal();
            cargarAdmins();
        } else {
            showAlert('modal-alert-zone', 'danger', data.detail || 'Error al registrar');
        }
    } catch (e) {
        showAlert('modal-alert-zone', 'danger', e.message);
    }
}

async function eliminarAdmin(id) {
    if (!confirm('¿Estás seguro de eliminar este administrador?')) return;
    try {
        const resp = await authFetch(`/api/admins/${id}`, { method: 'DELETE' });
        const data = await resp.json();
        if (resp.ok) {
            cargarAdmins();
        } else {
            alert(data.detail || 'Error al eliminar');
        }
    } catch (e) {
        alert(e.message);
    }
}


// ============================================================
//  SET EMAIL MODAL
// ============================================================

function abrirModalSetEmail(userId, nombreCompleto, emailActual) {
    const body = `
        <div id="modal-alert-zone"></div>
        <p style="margin-bottom:12px;color:var(--text-secondary);">Correo para <strong>${nombreCompleto}</strong></p>
        <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" class="form-control" id="set-email-input" value="${emailActual}" placeholder="usuario@ejemplo.com">
        </div>
        <input type="hidden" id="set-email-userid" value="${userId}">
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarEmail()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Guardar Correo</button>
    `;
    abrirModal('Editar Correo', body, footer);
}

async function guardarEmail() {
    const userId = document.getElementById('set-email-userid').value;
    const email = document.getElementById('set-email-input').value.trim();

    if (!email || !email.includes('@')) {
        showAlert('modal-alert-zone', 'danger', 'Ingresa un correo electrónico válido');
        return;
    }

    try {
        const resp = await authFetch(`/api/usuarios/${userId}/set-email`, {
            method: 'PUT',
            body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (resp.ok) {
            showAlert('modal-alert-zone', 'success', data.mensaje || '¡Correo actualizado!');
            setTimeout(() => { cerrarModal(); cargarUsuarios(); }, 1500);
        } else {
            showAlert('modal-alert-zone', 'danger', data.detail || 'Error al actualizar correo');
        }
    } catch (e) {
        showAlert('modal-alert-zone', 'danger', e.message);
    }
}


// ============================================================
//  SET PASSWORD MODAL
// ============================================================

function abrirModalSetPassword(userId, nombreCompleto, email) {
    if (!email) {
        alert('Este usuario necesita un email antes de asignarle contraseña. Usa primero el botón de correo para asignarle un correo.');
        return;
    }
    const body = `
        <div id="modal-alert-zone"></div>
        <p style="margin-bottom:12px;color:var(--text-secondary);">
            Asignar contraseña para <strong>${nombreCompleto}</strong><br>
            <small>Email: ${email}</small>
        </p>
        <div class="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" class="form-control" id="set-pw-password" placeholder="••••••••" minlength="6">
        </div>
        <div class="form-group">
            <label>Confirmar Contraseña</label>
            <input type="password" class="form-control" id="set-pw-confirm" placeholder="••••••••">
        </div>
        <input type="hidden" id="set-pw-userid" value="${userId}">
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarPassword()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Asignar Contraseña</button>
    `;
    abrirModal('Asignar Contraseña', body, footer);
}

async function guardarPassword() {
    const userId = document.getElementById('set-pw-userid').value;
    const password = document.getElementById('set-pw-password').value;
    const confirm = document.getElementById('set-pw-confirm').value;

    if (!password || password.length < 6) {
        showAlert('modal-alert-zone', 'danger', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }
    if (password !== confirm) {
        showAlert('modal-alert-zone', 'danger', 'Las contraseñas no coinciden');
        return;
    }

    try {
        const resp = await authFetch(`/api/usuarios/${userId}/set-password`, {
            method: 'PUT',
            body: JSON.stringify({ password }),
        });
        const data = await resp.json();
        if (resp.ok) {
            showAlert('modal-alert-zone', 'success', data.mensaje || '¡Contraseña asignada!');
            setTimeout(() => cerrarModal(), 1500);
        } else {
            showAlert('modal-alert-zone', 'danger', data.detail || 'Error al asignar contraseña');
        }
    } catch (e) {
        showAlert('modal-alert-zone', 'danger', e.message);
    }
}


// ============================================================
//  PROFESOR — Page Loaders
// ============================================================

let chartProfesorTendencia = null;

async function cargarProfesorGrupos() {
    // Load summary stats
    const resumen = await authFetch('/api/profesor/resumen').then(r => r.json()).catch(() => null);
    const statsGrid = document.getElementById('profesor-stats-grid');
    if (resumen && statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path></svg></div>
                <div class="stat-info"><h3>${resumen.total_grupos}</h3><p>Mis Grupos</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path></svg></div>
                <div class="stat-info"><h3>${resumen.total_alumnos}</h3><p>Total Alumnos</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="stat-info"><h3>${resumen.asistencias_hoy}</h3><p>Asistencias Hoy</p></div>
            </div>
        `;
    }

    // Load groups table
    const grupos = await authFetch('/api/profesor/mis-grupos').then(r => r.json()).catch(() => []);
    const tbody = document.getElementById('tabla-profesor-grupos');
    if (!grupos || grupos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No tienes grupos asignados</p></td></tr>';
        return;
    }

    tbody.innerHTML = grupos.map(g => `
        <tr>
            <td>${g.id}</td>
            <td>${g.materia_nombre} <small style="opacity:.6;">(${g.materia_clave})</small></td>
            <td>${g.aula}</td>
            <td>${g.semestre}</td>
            <td><span class="badge badge-info">${g.num_alumnos}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="verListaAsistenciaProfesor(${g.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> Lista</button>
            </td>
        </tr>
    `).join('');
}

function verListaAsistenciaProfesor(grupoId) {
    navigateTo('profesor-asistencia');
    setTimeout(() => {
        const sel = document.getElementById('profesor-asistencia-grupo-select');
        if (sel) { sel.value = grupoId; cargarProfesorListaAsistencia(); }
    }, 100);
}

async function cargarProfesorGruposSelect() {
    const grupos = await authFetch('/api/profesor/mis-grupos').then(r => r.json()).catch(() => []);
    const select = document.getElementById('profesor-asistencia-grupo-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona un grupo --</option>' +
        (grupos || []).map(g =>
            `<option value="${g.id}">${g.materia_nombre} (${g.aula})</option>`
        ).join('');
}

async function cargarProfesorListaAsistencia() {
    const grupoId = document.getElementById('profesor-asistencia-grupo-select').value;
    const fechaFiltro = document.getElementById('profesor-asistencia-fecha')?.value || '';
    const contenedor = document.getElementById('profesor-lista-asistencia-contenedor');
    const stats = document.getElementById('profesor-lista-asistencia-stats');

    if (!grupoId) {
        contenedor.innerHTML = '<div class="empty-state">Selecciona un grupo para ver la lista.</div>';
        if (stats) stats.innerHTML = '';
        return;
    }

    contenedor.innerHTML = '<div class="empty-state">Cargando datos...</div>';
    if (stats) stats.innerHTML = '';

    const url = fechaFiltro
        ? `/api/profesor/grupo/${grupoId}/tabla?fecha=${fechaFiltro}`
        : `/api/profesor/grupo/${grupoId}/tabla`;

    const data = await authFetch(url).then(r => r.json()).catch(() => null);
    if (!data || !data.dates) {
        contenedor.innerHTML = '<div class="empty-state">Error al cargar o sin registros</div>';
        return;
    }

    if (stats) stats.textContent = `Total de días de clase: ${data.total_class_days}`;

    const clsAsistencia = (estado) => {
        if (estado === 'ausente') return 'badge-danger';
        if (estado === 'fuera_de_horario') return 'badge-warning';
        if (estado === 'a_tiempo' || estado === 'justificado') return 'badge-success';
        if (estado === 'retardo') return 'badge-warning';
        return 'badge-secondary';
    };

    const mapLabels = {
        a_tiempo: 'A tiempo',
        retardo: 'Retardo',
        ausente: 'Ausente',
        fuera_de_horario: 'Fuera',
        justificado: 'Justificado'
    };

    const isExcluido = (f) => (data.excluded_dates || []).includes(f);

    // Build header
    let html = '<table><thead><tr>';
    html += '<th style="white-space:nowrap;">Participante</th><th>Rol</th><th>Asis.</th><th>Faltas</th>';
    for (const f of data.dates) {
        const excluido = isExcluido(f);
        html += `<th style="min-width:80px;text-align:center;${excluido ? 'opacity:0.5;' : ''}">
            <div style="${excluido ? 'text-decoration:line-through;' : ''}" title="${excluido ? 'Día excluido' : f}">${f.slice(5)}</div>
            <button class="btn btn-sm btn-outline" style="font-size:10px;margin-top:4px;"
                onclick="excluirDiaProfesor(${grupoId}, '${f}')">
                ${excluido ? 'Restaurar' : 'Pasar'}
            </button>
        </th>`;
    }
    html += '</tr></thead><tbody>';


    // Row builder
    const drawRow = (u, tipo) => {
        if (!u) return '';
        let row = `<tr>
            <td style="white-space:nowrap;font-weight:500;">${u.nombre} ${u.apellido}</td>
            <td><span class="badge ${tipo === 'Profesor' ? 'badge-purple' : 'badge-info'}">${tipo}</span></td>
            <td><b>${u.total_asistencias}</b></td>
            <td><b>${u.total_faltas}</b></td>
        `;
        for (const f of data.dates) {
            const estado = (u.asistencia_por_fecha?.[f]) || 'ausente';
            const excluido = isExcluido(f);
            let btnJustificar = '';
            if ((estado === 'ausente' || estado === 'fuera_de_horario') && !excluido && tipo === 'Alumno') {
                btnJustificar = `<br><button class="btn btn-sm btn-primary"
                    style="font-size:10px;margin-top:4px;padding:2px 6px;"
                    onclick="justificarFaltaProfesor(${u.id}, ${grupoId}, '${f}', '${u.nombre.replace(/'/g, "\\'")}')">
                    Justificar
                </button>`;
            }
            row += `<td style="text-align:center;opacity:${excluido ? 0.4 : 1};">
                <span class="badge ${clsAsistencia(estado)}">${mapLabels[estado] || estado}</span>
                ${btnJustificar}
            </td>`;
        }
        row += '</tr>';
        return row;
    };

    if (data.teacher) html += drawRow(data.teacher, 'Profesor');
    for (const s of data.students) html += drawRow(s, 'Alumno');
    html += '</tbody></table>';
    contenedor.innerHTML = html;
}

async function justificarFaltaProfesor(usuarioId, grupoId, fecha, nombre) {
    if (!confirm(`¿Justificar falta de ${nombre} el día ${fecha}?`)) return;
    const resp = await authFetch('/api/asistencia/justificar', {
        method: 'POST',
        body: JSON.stringify({ usuario_id: usuarioId, grupo_id: grupoId, fecha }),
    });
    if (resp && resp.ok) {
        cargarProfesorListaAsistencia();
    } else {
        const data = await resp?.json().catch(() => null);
        alert(data?.detail || 'Error al justificar la falta');
    }
}

async function excluirDiaProfesor(grupoId, fecha) {
    if (!confirm(`¿Pasar/restaurar el día ${fecha}? Un día excluido no cuenta en el conteo de asistencias.`)) return;
    const resp = await authFetch(`/api/profesor/grupo/${grupoId}/excluir_dia`, {
        method: 'POST',
        body: JSON.stringify({ fecha }),
    });
    if (resp && resp.ok) {
        cargarProfesorListaAsistencia();
    } else {
        const data = await resp?.json().catch(() => null);
        alert(data?.detail || 'Error al cambiar estado del día');
    }
}



async function cargarProfesorEmociones() {
    const dias = document.getElementById('profesor-emociones-dias')?.value || 30;
    const tendencia = await authFetch(`/api/profesor/emociones-tendencia?dias=${dias}`).then(r => r.json()).catch(() => []);

    const ctx = document.getElementById('chart-profesor-emociones-tendencia')?.getContext('2d');
    if (!ctx) return;
    if (chartProfesorTendencia) chartProfesorTendencia.destroy();

    if (!tendencia || tendencia.length === 0) {
        chartProfesorTendencia = null;
        return;
    }

    chartProfesorTendencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: tendencia.map(d => d.fecha.slice(5)),
            datasets: [
                { label: 'Positivo', data: tendencia.map(d => d.positivo), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 },
                { label: 'Neutro', data: tendencia.map(d => d.neutro), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.3 },
                { label: 'Negativo', data: tendencia.map(d => d.negativo), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: '#1e2843' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
}


// ============================================================
//  ALUMNO — Page Loaders
// ============================================================

async function cargarAlumnoClases() {
    // Load summary stats
    const resumen = await authFetch('/api/alumno/resumen').then(r => r.json()).catch(() => null);
    const statsGrid = document.getElementById('alumno-stats-grid');
    if (resumen && statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
                <div class="stat-info"><h3>${resumen.total_clases_inscritas}</h3><p>Clases Inscritas</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <div class="stat-info"><h3>${resumen.total_asistencias}</h3><p>Asistencias</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                <div class="stat-info"><h3>${resumen.total_faltas}</h3><p>Faltas</p></div>
            </div>
        `;
    }

    // Load classes table
    const clases = await authFetch('/api/alumno/mis-clases').then(r => r.json()).catch(() => []);
    const tbody = document.getElementById('tabla-alumno-clases');
    if (!clases || clases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No estás inscrito en ninguna clase</p></td></tr>';
        return;
    }

    tbody.innerHTML = clases.map(c => `
        <tr>
            <td>${c.materia_nombre}</td>
            <td>${c.profesor_nombre}</td>
            <td>${c.aula}</td>
            <td>${c.semestre}</td>
        </tr>
    `).join('');
}

async function cargarAlumnoAsistenciaInit() {
    // Populate filter dropdown
    const clases = await authFetch('/api/alumno/mis-clases').then(r => r.json()).catch(() => []);
    const select = document.getElementById('alumno-asistencia-clase-select');
    if (select) {
        select.innerHTML = '<option value="">— Todas las clases —</option>' +
            (clases || []).map(c =>
                `<option value="${c.grupo_id}">${c.materia_nombre}</option>`
            ).join('');
    }
    cargarAlumnoMiAsistencia();
}

async function cargarAlumnoMiAsistencia() {
    const grupoId = document.getElementById('alumno-asistencia-clase-select')?.value || '';
    const url = grupoId ? `/api/alumno/mi-asistencia?grupo_id=${grupoId}` : '/api/alumno/mi-asistencia';
    const registros = await authFetch(url).then(r => r.json()).catch(() => []);
    const tbody = document.getElementById('tabla-alumno-asistencia');

    if (!registros || registros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No hay registros de asistencia</p></td></tr>';
        return;
    }

    function estadoBadge(estado) {
        const map = {
            a_tiempo: ['A tiempo', 'badge-success'],
            retardo: ['Retardo', 'badge-warning'],
            ausente: ['Ausente', 'badge-danger'],
            fuera_de_horario: ['Fuera', 'badge-danger'],
            justificado: ['Justificado', 'badge-info'],
        };
        const [text, cls] = map[estado] || [estado || '—', 'badge-secondary'];
        return `<span class="badge ${cls}">${text}</span>`;
    }

    function emocionBadge(emocion) {
        const map = { positivo: 'Positivo', neutro: 'Neutro', negativo: 'Negativo' };
        return map[emocion] || emocion || '—';
    }

    tbody.innerHTML = registros.map(r => `
        <tr>
            <td>${r.materia_nombre}</td>
            <td>${r.fecha}</td>
            <td>${r.hora_registro}</td>
            <td>${estadoBadge(r.estado)}</td>
            <td>${emocionBadge(r.emocion)}</td>
        </tr>
    `).join('');
}
