import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: matricula,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.access_token, data.role);

        // Redirigir según el rol
        if (data.role === 'admin') navigate('/admin');
        else if (data.role === 'profesor') navigate('/profesor');
        else if (data.role === 'alumno') navigate('/alumno');
        else navigate('/');
      } else {
        setErrorMsg(data.detail || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <h1>KIRA UAS</h1>
          <p>Sistema de Gestión Escolar</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>Matrícula / Email</label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ingresa tu identificador"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="login-error">
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="login-hint">
          Contacta al administrador si no tienes cuenta.
        </p>
      </div>
    </div>
  );
};
