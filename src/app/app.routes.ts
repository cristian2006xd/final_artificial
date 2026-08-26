import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { AdminComponent } from './pages/admin/admin.component';
import { ContactComponent } from './pages/contact/contact.component';
import { LoginComponent } from './pages/login/login.component';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Prisma Market — Inicio' },
  { path: 'catalogo', component: CatalogComponent, title: 'Catálogo — Prisma Market' },
  { path: 'contacto', component: ContactComponent, title: 'Contacto — Prisma Market' },
  { path: 'login', component: LoginComponent, title: 'Iniciar sesión — Prisma Market' },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard], title: 'Panel admin — Prisma Market' },
  { path: '**', redirectTo: '' }
];
