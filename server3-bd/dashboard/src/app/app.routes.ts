import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'materias',
        loadComponent: () =>
          import('./pages/materias/materias.component').then((m) => m.MateriasComponent),
      },
      {
        path: 'grupos',
        loadComponent: () =>
          import('./pages/grupos/grupos.component').then((m) => m.GruposComponent),
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./pages/horarios/horarios.component').then((m) => m.HorariosComponent),
      },
      {
        path: 'inscripciones',
        loadComponent: () =>
          import('./pages/inscripciones/inscripciones.component').then((m) => m.InscripcionesComponent),
      },
      {
        path: 'asistencia',
        loadComponent: () =>
          import('./pages/asistencia/asistencia.component').then((m) => m.AsistenciaComponent),
      },
      {
        path: 'emociones',
        loadComponent: () =>
          import('./pages/emociones/emociones.component').then((m) => m.EmocionesComponent),
      },
      {
        path: 'admins',
        loadComponent: () =>
          import('./pages/admins/admins.component').then((m) => m.AdminsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
