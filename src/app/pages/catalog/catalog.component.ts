import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService, Product } from '../../core/catalog.service';
import { RoleService } from '../../core/role.service';

interface ProductDraft {
  name: string;
  price: number;
  stock: number;
  icon: string;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent {
  searchTerm = '';
  showOnlyFavorites = false;

  editingId: string | null = null;
  editDraft: ProductDraft = { name: '', price: 0, stock: 0, icon: '' };

  isAdding = false;
  newProduct: ProductDraft = { name: '', price: 0, stock: 0, icon: '' };

  constructor(public catalog: CatalogService, public role: RoleService) {}

  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    let list = this.catalog.products();

    if (term) {
      list = list.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    }
    if (this.showOnlyFavorites) {
      list = list.filter(p => this.catalog.favorites().has(p.id));
    }
    return list;
  }

  isFavorite(id: string): boolean {
    return this.catalog.favorites().has(id);
  }

  toggleFavorite(id: string, event: Event): void {
    event.stopPropagation();
    this.catalog.toggleFavorite(id);
  }

  startEdit(product: Product, event: Event): void {
    event.stopPropagation();
    this.editingId = product.id;
    this.editDraft = { name: product.name, price: product.price, stock: product.stock, icon: product.icon };
  }

  cancelEdit(event: Event): void {
    event.stopPropagation();
    this.editingId = null;
  }

  saveEdit(id: string, event: Event): void {
    event.stopPropagation();
    this.catalog.updateProduct(id, { ...this.editDraft });
    this.editingId = null;
  }

  deleteProduct(id: string, event: Event): void {
    event.stopPropagation();
    this.catalog.deleteProduct(id);
  }

  toggleAddForm(): void {
    this.isAdding = !this.isAdding;
    this.newProduct = { name: '', price: 0, stock: 0, icon: '' };
  }

  submitNewProduct(): void {
    if (!this.newProduct.name.trim()) {
      return;
    }
    this.catalog.addProduct(this.newProduct);
    this.isAdding = false;
    this.newProduct = { name: '', price: 0, stock: 0, icon: '' };
  }

  trackById(_index: number, product: Product): string {
    return product.id;
  }
}
