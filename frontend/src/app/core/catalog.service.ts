import { Injectable, effect, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface Product {
  id: string;
  name: string;
  category: string;
  icon: string;
  price: number;
  stock: number;
  rating: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly products = signal<Product[]>([]);
  readonly favorites = signal<Set<string>>(new Set());
  readonly loading = signal(true);

  constructor(private supabase: SupabaseService, private auth: AuthService) {
    this.loadProducts();

    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadFavorites(user.id);
      } else {
        this.favorites.set(new Set());
      }
    });
  }

  async addProduct(input: { name: string; price: number; stock: number; icon?: string }): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('products')
      .insert({
        name: input.name,
        category: input.name.toLowerCase().replace(/\s+/g, '_'),
        icon: input.icon?.trim() || '🧩',
        price: Math.max(0, input.price),
        stock: Math.max(0, Math.floor(input.stock)),
        rating: 5
      })
      .select()
      .single();

    if (!error && data) {
      this.products.update(list => [data as Product, ...list]);
    }
  }

  async updateProduct(id: string, changes: Partial<Pick<Product, 'name' | 'price' | 'stock' | 'icon'>>): Promise<void> {
    const { error } = await this.supabase.client.from('products').update(changes).eq('id', id);
    if (!error) {
      this.products.update(list => list.map(p => (p.id === id ? { ...p, ...changes } : p)));
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('products').delete().eq('id', id);
    if (!error) {
      this.products.update(list => list.filter(p => p.id !== id));
      if (this.favorites().has(id)) {
        const favs = new Set(this.favorites());
        favs.delete(id);
        this.favorites.set(favs);
      }
    }
  }

  async toggleFavorite(id: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }

    const favs = new Set(this.favorites());
    if (favs.has(id)) {
      await this.supabase.client.from('favorites').delete().eq('user_id', user.id).eq('product_id', id);
      favs.delete(id);
    } else {
      await this.supabase.client.from('favorites').insert({ user_id: user.id, product_id: id });
      favs.add(id);
    }
    this.favorites.set(favs);
  }

  private async loadProducts(): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.supabase.client.from('products').select('*').order('name');
    if (!error && data) {
      this.products.set(data as Product[]);
    }
    this.loading.set(false);
  }

  private async loadFavorites(userId: string): Promise<void> {
    const { data, error } = await this.supabase.client.from('favorites').select('product_id').eq('user_id', userId);
    if (!error && data) {
      this.favorites.set(new Set(data.map(row => row['product_id'] as string)));
    }
  }
}
