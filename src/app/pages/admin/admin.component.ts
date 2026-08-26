import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService, Product } from '../../core/catalog.service';
import { AppRole, AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  readonly users = signal<UserRow[]>([]);
  usersLoading = true;

  constructor(public catalog: CatalogService, public auth: AuthService, private supabase: SupabaseService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get totalProducts(): number {
    return this.catalog.products().length;
  }

  get totalStock(): number {
    return this.catalog.products().reduce((sum, p) => sum + p.stock, 0);
  }

  get averagePrice(): number {
    const products = this.catalog.products();
    if (products.length === 0) {
      return 0;
    }
    return products.reduce((sum, p) => sum + p.price, 0) / products.length;
  }

  get lowStockProducts(): Product[] {
    return this.catalog.products().filter(p => p.stock < 5);
  }

  updateField(product: Product, field: 'price' | 'stock', value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.catalog.updateProduct(product.id, { [field]: parsed });
  }

  deleteProduct(id: string): void {
    this.catalog.deleteProduct(id);
  }

  async setUserRole(userId: string, role: AppRole): Promise<void> {
    const { error } = await this.supabase.client.from('profiles').update({ role }).eq('id', userId);
    if (!error) {
      this.users.update(list => list.map(u => (u.id === userId ? { ...u, role } : u)));
    }
  }

  trackById(_index: number, product: Product): string {
    return product.id;
  }

  trackByUserId(_index: number, user: UserRow): string {
    return user.id;
  }

  private async loadUsers(): Promise<void> {
    this.usersLoading = true;
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, name, email, role')
      .order('created_at');

    if (!error && data) {
      this.users.set(data as UserRow[]);
    }
    this.usersLoading = false;
  }
}
