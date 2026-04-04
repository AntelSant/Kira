/* ============================================================
   KIRA UAS — Dashboard Application (Vanilla JS)
   ============================================================ */

// ── Configuration ───────────────────────────────────────────
const API_BASE = window.location.origin;  // Server3
const SERVER1_URL = localStorage.getItem('server1_url') || 'http://127.0.0.1:8001';

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
        const admin = await resp.json();
        showDashboard(admin);
    } catch {
        clearToken();
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    document.getElementById('login-email').focus();
}

function showDashboard(admin) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
    document.getElementById('admin-name').textContent = admin.nombre;
    cargarInicio();
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
            showDashboard({ nombre: data.nombre });
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

function navigateTo(page) {
    currentPage = page;

    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    // Show page
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');

    // Load data
    const loaders = {
        inicio: cargarInicio,
        usuarios: cargarUsuarios,
        materias: cargarMaterias,
        grupos: cargarGrupos,
        horarios: () => { cargarGruposSelect('horario-grupo-select'); },
        inscripciones: () => { cargarGruposSelect('inscripcion-grupo-select'); cargarAlumnosDisponibles(); },
        asistencia: () => { cargarGruposSelect('asistencia-grupo-select'); },
        emociones: cargarEmocionesGrafica,
        admins: cargarAdmins,
    };
    if (loaders[page]) loaders[page]();
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
    const icons = { success: '✅', danger: '❌', info: 'ℹ️' };
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
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: '#1e2843' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });
    }

    // Chart: Emociones
    const emociones = await api('/api/dashboard/emociones?dias=7');
    if (emociones && emociones.datos) {
        const ctx = document.getElementById('chart-emociones').getContext('2d');
        if (chartEmociones) chartEmociones.destroy();

        const colorMap = { positivo: '#10b981', neutro: '#6366f1', negativo: '#ef4444' };
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
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', padding: 16 }
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
                <div style="display:flex;align-items:center;gap:8px;">
                    ${u.foto_perfil ? `<img src="${u.foto_perfil}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` : ''}
                    <span>${u.nombre} ${u.apellido}</span>
                </div>
            </td>
            <td><code>${u.matricula}</code></td>
            <td><span class="badge ${u.tipo === 'alumno' ? 'badge-info' : 'badge-purple'}">${u.tipo}</span></td>
            <td>${u.tiene_embedding ? '<span class="badge badge-success">✅ Sí</span>' : '<span class="badge badge-warning">⚠️ No</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="abrirModalCapturaCara('${u.matricula}', '${u.nombre} ${u.apellido}')">📷 Cara</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${u.id})">🗑️</button>
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
        <button class="btn btn-primary" onclick="guardarUsuario()">💾 Registrar</button>
    `;
    abrirModal('➕ Nuevo Usuario', body, footer);
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
                <div class="placeholder">📷 Vista previa</div>
            </div>
            <div class="camera-actions">
                <button class="btn btn-outline" onclick="iniciarCamara()">🎥 Usar Cámara</button>
                <button class="btn btn-outline" onclick="document.getElementById('file-upload-cara').click()">📁 Subir Imagen</button>
                <input type="file" id="file-upload-cara" accept="image/*" style="display:none" onchange="cargarImagenCara(event)">
                <button class="btn btn-primary hidden" id="btn-capturar" onclick="capturarFoto()">📸 Capturar</button>
            </div>
        </div>
        <input type="hidden" id="cara-matricula" value="${matricula}">
        <canvas id="canvas-captura" style="display:none;"></canvas>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-enviar-cara" onclick="enviarCara()" disabled>🚀 Registrar Cara</button>
    `;
    abrirModal('📷 Registro Facial', body, footer);
}

let capturedBase64 = null;

async function iniciarCamara() {
    // Verificar que la API existe (requiere HTTPS o localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const esHTTP = location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
        if (esHTTP) {
            showAlert('modal-alert-zone', 'danger',
                '⚠️ La cámara requiere acceder por <strong>localhost</strong> o HTTPS. ' +
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
            msg = '🔒 Permiso de cámara denegado. Haz clic en el ícono de cámara 🔒 en la barra de dirección ' +
                'del navegador y selecciona <strong>"Permitir"</strong>, luego vuelve a intentarlo.';
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            msg = '📷 No se encontró ninguna cámara. Conecta una webcam y vuelve a intentarlo.';
        } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
            msg = '⚠️ La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentarlo.';
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
    btn.textContent = '⏳ Procesando...';

    const result = await apiServer1('/api/register', {
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
        btn.textContent = '🚀 Registrar Cara';
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
        <button class="btn btn-primary" onclick="guardarMateria()">💾 Registrar</button>
    `;
    abrirModal('➕ Nueva Materia', body, footer);
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
        <button class="btn btn-primary" onclick="guardarGrupo()">💾 Registrar</button>
    `;
    abrirModal('➕ Nuevo Grupo', body, footer);
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
            <td><button class="btn btn-sm btn-danger" onclick="eliminarHorario(${h.id})">🗑️</button></td>
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
        <button class="btn btn-primary" onclick="guardarHorario()">💾 Registrar</button>
    `;
    abrirModal('➕ Nuevo Horario', body, footer);
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
//  INSCRIPCIONES
// ============================================================

let alumnosDisponibles = [];

async function cargarAlumnosDisponibles() {
    alumnosDisponibles = await api('/api/usuarios?tipo=alumno') || [];
}

async function cargarInscripciones() {
    const grupoId = document.getElementById('inscripcion-grupo-select').value;
    const tbody = document.getElementById('tabla-inscripciones');
    if (!grupoId) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>Selecciona un grupo</p></td></tr>';
        return;
    }

    const inscripciones = await api(`/api/inscripciones/${grupoId}`);
    if (!inscripciones || inscripciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>Sin alumnos inscritos</p></td></tr>';
        return;
    }

    tbody.innerHTML = inscripciones.map(i => `
        <tr>
            <td>${i.inscripcion_id}</td>
            <td>${i.nombre}</td>
            <td><code>${i.matricula}</code></td>
            <td><button class="btn btn-sm btn-danger" onclick="eliminarInscripcion(${i.inscripcion_id})">🗑️</button></td>
        </tr>
    `).join('');
}

function abrirModalInscripcion() {
    const grupoId = document.getElementById('inscripcion-grupo-select').value;
    if (!grupoId) {
        alert('Primero selecciona un grupo');
        return;
    }

    const alumnosOptions = alumnosDisponibles.map(a =>
        `<option value="${a.id}">${a.nombre} ${a.apellido} — ${a.matricula}</option>`
    ).join('');

    const body = `
        <div id="modal-alert-zone"></div>
        <input type="hidden" id="ins-grupo" value="${grupoId}">
        <div class="form-group">
            <label>Alumno</label>
            <select class="form-control" id="ins-alumno">${alumnosOptions || '<option>No hay alumnos</option>'}</select>
        </div>
    `;
    const footer = `
        <button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarInscripcion()">💾 Inscribir</button>
    `;
    abrirModal('➕ Inscribir Alumno', body, footer);
}

async function guardarInscripcion() {
    const payload = {
        alumno_id: parseInt(document.getElementById('ins-alumno').value),
        grupo_id: parseInt(document.getElementById('ins-grupo').value),
    };
    const result = await api('/api/inscripciones/registrar', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (result && result.inscripcion_id) {
        cerrarModal();
        cargarInscripciones();
    } else {
        showAlert('modal-alert-zone', 'danger', result?.detail || 'Error al inscribir');
    }
}

async function eliminarInscripcion(id) {
    if (!confirm('¿Eliminar esta inscripción?')) return;
    await api(`/api/inscripciones/${id}`, { method: 'DELETE' });
    cargarInscripciones();
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
        };
        const labels = {
            a_tiempo: 'A tiempo',
            retardo: 'Retardo',
            fuera_de_horario: 'Fuera de horario',
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
                    <button class="btn btn-sm btn-danger" onclick="eliminarAdmin(${a.id})">🗑️</button>
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
        <button class="btn btn-primary" onclick="guardarAdmin()">💾 Registrar</button>
    `;
    abrirModal('🛡️ Nuevo Administrador', body, footer);
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
