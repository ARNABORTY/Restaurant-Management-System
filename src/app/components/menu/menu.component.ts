import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { CartService } from '../../services/cart.service';

type MenuCategory = 'Starters' | 'Royal Mains' | 'Desserts' | 'Beverages';

interface MenuDish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image: string;
  tag?: string;
}

@Component({
  imports: [CommonModule],
  selector: 'app-menu',
  standalone: true,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  protected readonly cart = inject(CartService);

  protected readonly categories: Array<MenuCategory | 'All'> = [
    'All',
    'Starters',
    'Royal Mains',
    'Desserts',
    'Beverages',
  ];

  protected readonly activeCategory = signal<MenuCategory | 'All'>('All');

  protected readonly dishes: MenuDish[] = [
    {
      id: 'saffron-scallops',
      name: 'Saffron Sea Scallops',
      description: 'Pan-seared scallops, Kashmiri saffron beurre blanc, garden herbs.',
      price: 1250,
      category: 'Starters',
      image:
        'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=85',
      tag: "CHEF'S SIGNATURE",
    },
    {
      id: 'tandoori-burrata',
      name: 'Tandoori Burrata',
      description: 'Smoked heirloom tomato, basil oil, crisp sourdough.',
      price: 890,
      category: 'Starters',
      image:
        'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=900&q=85',
    },
    {
      id: 'lamb-shank',
      name: 'Lamb Shank Rogan Josh',
      description: 'Slow-braised Himalayan lamb, morel pulao, saffron raita.',
      price: 2450,
      category: 'Royal Mains',
      image:
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85',
      tag: 'A HOUSE FAVOURITE',
    },
    {
      id: 'mushroom-khichdi',
      name: 'Wild Mushroom Khichdi',
      description: 'Black truffle, aged basmati, parmesan crisp, brown butter.',
      price: 1650,
      category: 'Royal Mains',
      image:
        'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=900&q=85',
    },
    {
      id: 'rose-pistachio-kulfi',
      name: 'Rose & Pistachio Kulfi',
      description: 'House-churned kulfi, candied rose petals, pistachio praline.',
      price: 650,
      category: 'Desserts',
      image:
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85',
    },
    {
      id: 'dark-chocolate-delice',
      name: 'Dark Chocolate Délice',
      description: '70% single-origin cacao, sea salt, warm cardamom cream.',
      price: 720,
      category: 'Desserts',
      image:
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85',
    },
    {
      id: 'nimbu-elderflower',
      name: 'Nimbu & Elderflower',
      description: 'Pressed Himalayan lime, elderflower, sparkling water.',
      price: 480,
      category: 'Beverages',
      image:
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85',
    },
    {
      id: 'kashmiri-kahwa',
      name: 'Kashmiri Kahwa',
      description: 'Saffron, cinnamon, green cardamom, slivered almonds.',
      price: 390,
      category: 'Beverages',
      image:
        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=85',
    },
  ];

  protected get filteredDishes(): MenuDish[] {
    const category = this.activeCategory();
    return category === 'All'
      ? this.dishes
      : this.dishes.filter((dish) => dish.category === category);
  }

  protected selectCategory(category: MenuCategory | 'All'): void {
    this.activeCategory.set(category);
  }

  protected addToOrder(dish: MenuDish): void {
    this.cart.addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      category: dish.category,
      image: dish.image,
    });
  }
}
