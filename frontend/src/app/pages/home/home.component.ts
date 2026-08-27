import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService, Product } from '../../core/catalog.service';
import { ChatUiService } from '../../core/chat-ui.service';

interface StatCard {
  label: string;
  target: number;
  suffix: string;
  value: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  featured: Product[] = [];

  stats: StatCard[] = [
    { label: 'Categorías del catálogo', target: 101, suffix: '', value: 0 },
    { label: 'Imágenes en el dataset original', target: 9146, suffix: '+', value: 0 },
    { label: 'Disponible', target: 24, suffix: '/7', value: 0 }
  ];

  constructor(private catalog: CatalogService, public chatUi: ChatUiService) {}

  ngOnInit(): void {
    this.featured = this.catalog.products().slice(0, 8);
    this.animateStats();
  }

  private animateStats(): void {
    const duration = 1200;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.stats = this.stats.map(stat => ({ ...stat, value: Math.round(stat.target * eased) }));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
}
