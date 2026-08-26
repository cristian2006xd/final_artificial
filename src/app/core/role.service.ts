import { Injectable, signal } from '@angular/core';

export type AppRole = 'cliente' | 'administrador';

const STORAGE_KEY = 'app_role';

@Injectable({ providedIn: 'root' })
export class RoleService {
  readonly role = signal<AppRole>(this.loadRole());

  get isAdmin(): boolean {
    return this.role() === 'administrador';
  }

  setRole(role: AppRole): void {
    this.role.set(role);
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // storage unavailable, ignore
    }
  }

  toggleRole(): void {
    this.setRole(this.isAdmin ? 'cliente' : 'administrador');
  }

  private loadRole(): AppRole {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'administrador' ? 'administrador' : 'cliente';
    } catch {
      return 'cliente';
    }
  }
}
