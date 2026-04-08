import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Admin, LoginResponse } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiBase;
  private adminSubject = new BehaviorSubject<Admin | null>(null);

  admin$ = this.adminSubject.asObservable();

  getToken(): string | null {
    return sessionStorage.getItem('kira_token');
  }

  setToken(token: string): void {
    sessionStorage.setItem('kira_token', token);
  }

  clearToken(): void {
    sessionStorage.removeItem('kira_token');
    this.adminSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setAdmin(admin: Admin): void {
    this.adminSubject.next(admin);
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const resp = await fetch(`${this.API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.detail || 'Credenciales incorrectas');
    }
    this.setToken(data.access_token);
    this.adminSubject.next({ id: 0, nombre: data.nombre, email });
    return data;
  }

  async validateToken(): Promise<Admin | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const resp = await fetch(`${this.API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Token inválido');
      const admin: Admin = await resp.json();
      this.adminSubject.next(admin);
      return admin;
    } catch {
      this.clearToken();
      return null;
    }
  }

  logout(): void {
    this.clearToken();
  }
}
