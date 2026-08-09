import { create } from 'zustand';

export interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl?: string; // Legacy
  imageUrls?: string[];
  description?: string;
  category?: string;
  dimensions?: string;
  material?: string;
  colors?: string[];
  discount?: { type: 'percent' | 'fixed', value: number };
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
  cartItemId: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, selectedColor?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product, selectedColor) => {
    set((state) => {
      const cartItemId = `${product.id}-${selectedColor || 'default'}`;
      const existingItem = state.items.find((item) => item.cartItemId === cartItemId);
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1, selectedColor, cartItemId }] };
    });
  },
  removeItem: (cartItemId) => {
    set((state) => ({
      items: state.items.filter((item) => item.cartItemId !== cartItemId),
    }));
  },
  updateQuantity: (cartItemId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
  },
  clearCart: () => set({ items: [] }),
  getTotalPrice: () => {
    return get().items.reduce((total, item) => {
      let currentPrice = item.price;
      if (item.discount) {
        if (item.discount.type === 'percent') {
          currentPrice = Math.round(currentPrice * (1 - item.discount.value / 100));
        } else if (item.discount.type === 'fixed') {
          currentPrice = currentPrice - item.discount.value;
        }
      }
      return total + currentPrice * item.quantity;
    }, 0);
  },
}));
