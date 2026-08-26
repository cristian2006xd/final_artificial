import { Injectable, signal } from '@angular/core';

export interface Product {
  id: string;
  name: string;
  category: string;
  icon: string;
  price: number;
  stock: number;
  rating: number;
}

const STORAGE_KEY = 'marketplace_products';
const FAVORITES_KEY = 'marketplace_favorites';

// Categorías del dataset académico Caltech-101 (101 clases de objetos),
// usadas aquí como catálogo de ejemplo para el marketplace.
const CALTECH101_CATEGORIES = [
  'accordion', 'airplanes', 'anchor', 'ant', 'barrel', 'bass', 'beaver', 'binocular',
  'bonsai', 'brain', 'brontosaurus', 'buddha', 'butterfly', 'camera', 'cannon', 'car_side',
  'ceiling_fan', 'cellphone', 'chair', 'chandelier', 'cougar_body', 'cougar_face', 'crab',
  'crayfish', 'crocodile', 'crocodile_head', 'cup', 'dalmatian', 'dollar_bill', 'dolphin',
  'dragonfly', 'electric_guitar', 'elephant', 'emu', 'euphonium', 'ewer', 'faces', 'faces_easy',
  'ferry', 'flamingo', 'flamingo_head', 'garfield', 'gerenuk', 'gramophone', 'grand_piano',
  'hawksbill', 'headphone', 'hedgehog', 'helicopter', 'ibis', 'inline_skate', 'joshua_tree',
  'kangaroo', 'ketch', 'lamp', 'laptop', 'leopards', 'llama', 'lobster', 'lotus', 'mandolin',
  'mayfly', 'menorah', 'metronome', 'minaret', 'motorbikes', 'nautilus', 'octopus', 'okapi',
  'pagoda', 'panda', 'pigeon', 'pizza', 'platypus', 'pyramid', 'revolver', 'rhino', 'rooster',
  'saxophone', 'schooner', 'scissors', 'scorpion', 'sea_horse', 'snoopy', 'soccer_ball',
  'stapler', 'starfish', 'stegosaurus', 'stop_sign', 'strawberry', 'sunflower', 'tick',
  'trilobite', 'umbrella', 'watch', 'water_lilly', 'wheelchair', 'wild_cat', 'windsor_chair',
  'wrench', 'yin_yang'
];

const CATEGORY_ICONS: Record<string, string> = {
  accordion: '🪗', airplanes: '✈️', anchor: '⚓', ant: '🐜', barrel: '🛢️', bass: '🐟',
  beaver: '🦫', binocular: '🔭', bonsai: '🌳', brain: '🧠', buddha: '🧘', butterfly: '🦋',
  camera: '📷', car_side: '🚗', ceiling_fan: '🌀', cellphone: '📱', chair: '🪑',
  chandelier: '💡', cougar_body: '🐆', cougar_face: '🐆', crab: '🦀', crayfish: '🦞',
  crocodile: '🐊', crocodile_head: '🐊', cup: '☕', dalmatian: '🐕', dollar_bill: '💵',
  dolphin: '🐬', dragonfly: '🦟', electric_guitar: '🎸', elephant: '🐘', emu: '🦤',
  ewer: '🏺', faces: '🙂', faces_easy: '🙂', ferry: '⛴️', flamingo: '🦩', flamingo_head: '🦩',
  garfield: '🐱', gramophone: '🎶', grand_piano: '🎹', hawksbill: '🐢', headphone: '🎧',
  hedgehog: '🦔', helicopter: '🚁', ibis: '🐦', inline_skate: '⛸️', joshua_tree: '🌵',
  kangaroo: '🦘', lamp: '💡', laptop: '💻', leopards: '🐆', llama: '🦙', lobster: '🦞',
  lotus: '🪷', mandolin: '🪕', motorbikes: '🏍️', octopus: '🐙', pagoda: '🏯', panda: '🐼',
  pigeon: '🐦', pizza: '🍕', pyramid: '🔺', rhino: '🦏', rooster: '🐓', saxophone: '🎷',
  schooner: '⛵', scissors: '✂️', scorpion: '🦂', sea_horse: '🌊', snoopy: '🐶',
  soccer_ball: '⚽', stapler: '📎', starfish: '⭐', stegosaurus: '🦕', stop_sign: '🛑',
  strawberry: '🍓', sunflower: '🌻', umbrella: '☂️', watch: '⌚', water_lilly: '🪷',
  wheelchair: '♿', wild_cat: '🐈', windsor_chair: '🪑', wrench: '🔧', yin_yang: '☯️'
};

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toDisplayName(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function buildSeedProducts(): Product[] {
  return CALTECH101_CATEGORIES.map((category, index) => {
    const rand = seededRandom(index * 97 + 13);
    return {
      id: category,
      name: toDisplayName(category),
      category,
      icon: CATEGORY_ICONS[category] ?? '🧩',
      price: Math.round((12 + rand() * 88) * 100) / 100,
      stock: Math.floor(rand() * 45) + 1,
      rating: Math.round((3 + rand() * 2) * 10) / 10
    };
  });
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly products = signal<Product[]>(this.loadProducts());
  readonly favorites = signal<Set<string>>(this.loadFavorites());

  private loadProducts(): Product[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fall through to seed data
    }
    const seeded = buildSeedProducts();
    this.persist(seeded);
    return seeded;
  }

  private loadFavorites(): Set<string> {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private persist(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {
      // storage unavailable, ignore
    }
  }

  private persistFavorites(favorites: Set<string>): void {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      // storage unavailable, ignore
    }
  }

  addProduct(input: { name: string; price: number; stock: number; icon?: string }): void {
    const product: Product = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      category: input.name.toLowerCase().replace(/\s+/g, '_'),
      icon: input.icon?.trim() || '🧩',
      price: Math.max(0, input.price),
      stock: Math.max(0, Math.floor(input.stock)),
      rating: 5
    };
    const updated = [product, ...this.products()];
    this.products.set(updated);
    this.persist(updated);
  }

  updateProduct(id: string, changes: Partial<Pick<Product, 'name' | 'price' | 'stock' | 'icon'>>): void {
    const updated = this.products().map(p => (p.id === id ? { ...p, ...changes } : p));
    this.products.set(updated);
    this.persist(updated);
  }

  deleteProduct(id: string): void {
    const updated = this.products().filter(p => p.id !== id);
    this.products.set(updated);
    this.persist(updated);

    if (this.favorites().has(id)) {
      const favs = new Set(this.favorites());
      favs.delete(id);
      this.favorites.set(favs);
      this.persistFavorites(favs);
    }
  }

  toggleFavorite(id: string): void {
    const favs = new Set(this.favorites());
    if (favs.has(id)) {
      favs.delete(id);
    } else {
      favs.add(id);
    }
    this.favorites.set(favs);
    this.persistFavorites(favs);
  }
}
