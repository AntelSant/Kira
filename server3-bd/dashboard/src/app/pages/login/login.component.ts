import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-brand">
          <div class="login-logo">🤖</div>
          <h1>Kira UAS</h1>
          <p>Sistema de Asistencia Inteligente</p>
        </div>

        <form (ngSubmit)="handleLogin()" #loginForm="ngForm">
          <div class="login-field">
            <label for="login-email">Correo electrónico</label>
            <input
              type="email"
              id="login-email"
              [(ngModel)]="email"
              name="email"
              placeholder="admin@uas.edu.mx"
              required
              autocomplete="username"
            />
          </div>

          <div class="login-field">
            <label for="login-password">Contraseña</label>
            <div class="password-wrapper">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="login-password"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-pass"
                (click)="showPassword = !showPassword"
                title="Mostrar/ocultar"
              >
                👁
              </button>
            </div>
          </div>

          @if (errorMessage) {
            <div class="login-error">{{ errorMessage }}</div>
          }

          <button
            type="submit"
            class="btn btn-primary btn-full"
            [disabled]="loading"
          >
            {{ loading ? 'Verificando...' : 'Iniciar sesión' }}
          </button>
        </form>

        <p class="login-hint">Solo administradores autorizados pueden acceder</p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async handleLogin(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;

    try {
      await this.authService.login(this.email.trim(), this.password);
      this.router.navigate(['/inicio']);
    } catch (e: any) {
      this.errorMessage = e.message || 'Error de conexión con el servidor';
    } finally {
      this.loading = false;
    }
  }
}
