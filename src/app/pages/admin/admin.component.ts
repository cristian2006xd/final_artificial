import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService, Product } from '../../core/catalog.service';
import { RoleService } from '../../core/role.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  constructor(public catalog: CatalogService, public role: RoleService) {}

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

  trackById(_index: number, product: Product): string {
    return product.id;
  }
}
