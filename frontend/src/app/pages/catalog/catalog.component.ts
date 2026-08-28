import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService, Product } from '../../core/catalog.service';
import { AuthService } from '../../core/auth.service';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';

interface ProductDraft {
  name: string;
  price: number;
  stock: number;
  icon: string;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent {
  searchTerm = '';
  showOnlyFavorites = false;

  isAdding = false;
  newProduct: ProductDraft = { name: '', price: 0, stock: 0, icon: '' };

  constructor(public catalog: CatalogService, public auth: AuthService) {}

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
