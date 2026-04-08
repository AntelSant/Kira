import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  page: string;
  icon: string;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <h1>🤖 Kira</h1>
        <p>UAS — Asistencia IA</p>
      </div>

      <nav class="sidebar-nav">
        @for (section of navSections; track section.label) {
          <div class="nav-section-label">{{ section.label }}</div>
          @for (item of section.items; track item.page) {
            <a
              class="nav-item"
              [routerLink]="['/' + item.page]"
              routerLinkActive="active"
            >
              <span class="icon">{{ item.icon }}</span> {{ item.label }}
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <div class="admin-info" id="admin-info">
          <span class="admin-avatar">👤</span>
          <span class="admin-name" id="admin-name">{{ adminName }}</span>
        </div>
        <button class="btn-logout" (click)="onLogout()" title="Cerrar sesión">
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  adminName = '—';

  navSections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        { page: 'inicio', icon: '🏠', label: 'Inicio' },
        { page: 'usuarios', icon: '👥', label: 'Usuarios' },
      ],
    },
    {
      label: 'Académico',
      items: [
        { page: 'materias', icon: '📚', label: 'Materias' },
        { page: 'grupos', icon: '🏫', label: 'Grupos' },
        { page: 'horarios', icon: '🕐', label: 'Horarios' },
        { page: 'inscripciones', icon: '📋', label: 'Inscripciones' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { page: 'asistencia', icon: '✅', label: 'Asistencia' },
        { page: 'emociones', icon: '😊', label: 'Emociones' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { page: 'admins', icon: '🛡️', label: 'Administradores' },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.admin$.subscribe((admin) => {
      this.adminName = admin?.nombre || '—';
    });
  }

  onLogout(): void {
    if (!confirm('¿Cerrar sesión?')) return;
    this.authService.logout();
    window.location.href = '/login';
  }
}
