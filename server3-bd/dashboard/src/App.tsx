import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { BackgroundBlobs } from './components/layout/BackgroundBlobs';
import { LoginPage } from './pages/LoginPage';

// Admin Pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsuariosPage } from './pages/admin/UsuariosPage';
import { MateriasPage } from './pages/admin/MateriasPage';
import { GruposPage } from './pages/admin/GruposPage';
import { HorariosPage } from './pages/admin/HorariosPage';
import { InscripcionesPage } from './pages/admin/InscripcionesPage';
import { AsistenciaPage } from './pages/admin/AsistenciaPage';
import { ListaAsistenciaPage } from './pages/admin/ListaAsistenciaPage';
import { EmocionesPage } from './pages/admin/EmocionesPage';
import { AdminsPage } from './pages/admin/AdminsPage';
import { AlertasPage } from './pages/admin/AlertasPage';
import { ReporteAlumnoPage } from './pages/admin/ReporteAlumnoPage';

// Profesor & Alumno Pages
import { ProfesorGruposPage } from './pages/profesor/ProfesorGruposPage';
import { ProfesorAsistenciaPage } from './pages/profesor/ProfesorAsistenciaPage';
import { ProfesorEmocionesPage } from './pages/profesor/ProfesorEmocionesPage';
import { AlumnoClasesPage } from './pages/alumno/AlumnoClasesPage';
import { AlumnoAsistenciaPage } from './pages/alumno/AlumnoAsistenciaPage';

// Rutas protegidas basadas en roles
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { token, role, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
  }

  if (!token || !role || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Componente App principal
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rutas para Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="materias" element={<MateriasPage />} />
        <Route path="grupos" element={<GruposPage />} />
        <Route path="horarios" element={<HorariosPage />} />
        <Route path="inscripciones" element={<InscripcionesPage />} />
        <Route path="asistencia" element={<AsistenciaPage />} />
        <Route path="lista-asistencia" element={<ListaAsistenciaPage />} />
        <Route path="emociones" element={<EmocionesPage />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="alertas" element={<AlertasPage />} />
        <Route path="alertas/reporte/:alumnoId" element={<ReporteAlumnoPage />} />
      </Route>

      {/* Rutas para Profesor */}
      <Route path="/profesor" element={<ProtectedRoute allowedRoles={['profesor']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<ProfesorGruposPage />} />
        <Route path="asistencia" element={<ProfesorAsistenciaPage />} />
        <Route path="emociones" element={<ProfesorEmocionesPage />} />
      </Route>

      {/* Rutas para Alumno */}
      <Route path="/alumno" element={<ProtectedRoute allowedRoles={['alumno']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<AlumnoClasesPage />} />
        <Route path="asistencia" element={<AlumnoAsistenciaPage />} />
      </Route>

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <BackgroundBlobs />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
