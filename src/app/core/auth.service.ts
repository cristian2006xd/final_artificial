import { Injectable, computed, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export type AppRole = 'cliente' | 'administrador';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

const CACHE_KEY = 'app_user_cache';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Se hidrata primero desde un caché local (para que la UI no "parpadee" al
  // recargar la página) y luego se corrige con la sesión real de Supabase.
  readonly currentUser = signal<AuthUser | null>(this.loadCache());
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'administrador');
  readonly ready = signal(false);

  constructor(private supabase: SupabaseService) {
    this.init();
  }

  async signUp(name: string, email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    return error?.message ?? null;
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.currentUser.set(null);
    this.clearCache();
  }

  private async init(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    await this.syncFromSession(data.session);
    this.ready.set(true);

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.syncFromSession(session);
    });
  }

  private async syncFromSession(session: Session | null): Promise<void> {
    if (!session?.user) {
      this.currentUser.set(null);
      this.clearCache();
      return;
    }

    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      const user = profile as AuthUser;
      this.currentUser.set(user);
      this.saveCache(user);
    }
  }

  private loadCache(): AuthUser | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveCache(user: AuthUser): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    } catch {
      // storage unavailable, ignore
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
  }
}
