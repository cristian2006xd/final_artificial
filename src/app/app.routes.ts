import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { AdminComponent } from './pages/admin/admin.component';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Caltech101 Market — Inicio' },
  { path: 'catalogo', component: CatalogComponent, title: 'Catálogo — Caltech101 Market' },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard], title: 'Panel admin — Caltech101 Market' },
  { path: '**', redirectTo: '' }
];
