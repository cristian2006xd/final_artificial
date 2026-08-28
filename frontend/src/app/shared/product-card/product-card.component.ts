import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService, Product } from '../../core/catalog.service';
import { AuthService } from '../../core/auth.service';
import { productImageFor } from '../../core/product-images';

interface ProductDraft {
  name: string;
  price: number;
  stock: number;
  icon: string;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  isEditing = false;
  editDraft: ProductDraft = { name: '', price: 0, stock: 0, icon: '' };

  constructor(public catalog: CatalogService, public auth: AuthService, private router: Router) {}

  get image(): string | null {
    return productImageFor(this.product.category);
  }

  isFavorite(): boolean {
    return this.catalog.favorites().has(this.product.id);
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.catalog.toggleFavorite(this.product.id);
  }

  startEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.editDraft = {
      name: this.product.name,
      price: this.product.price,
      stock: this.product.stock,
      icon: this.product.icon
    };
    this.isEditing = true;
  }

  cancelEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isEditing = false;
  }

  saveEdit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.catalog.updateProduct(this.product.id, { ...this.editDraft });
    this.isEditing = false;
  }

  deleteProduct(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.catalog.deleteProduct(this.product.id);
  }
}
