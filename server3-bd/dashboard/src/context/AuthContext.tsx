import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, RolUsuario } from '../types';
import { authFetch } from '../api/client';

interface AuthContextType {
  token: string | null;
  role: RolUsuario | null;
  user: Usuario | null;
  isLoading: boolean;
  login: (token: string, role: RolUsuario) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('kira_token'));
  const [role, setRole] = useState<RolUsuario | null>(sessionStorage.getItem('kira_role') as RolUsuario | null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, newRole: RolUsuario) => {
    sessionStorage.setItem('kira_token', newToken);
    sessionStorage.setItem('kira_role', newRole);
    setToken(newToken);
    setRole(newRole);
  };

  const logout = () => {
    sessionStorage.removeItem('kira_token');
    sessionStorage.removeItem('kira_role');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await authFetch('/auth/me');
          if (response.ok) {
            const data = await response.json();
            setUser(data);
          } else {
            // Token inválido o expirado
            logout();
          }
        } catch (error) {
          console.error("Error fetching user details", error);
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, role, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
