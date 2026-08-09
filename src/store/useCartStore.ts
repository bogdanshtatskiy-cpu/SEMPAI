import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import WebApp from '@twa-dev/sdk';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: 'cart-storage',
    }
  )
);

let syncTimeout: NodeJS.Timeout;

useCartStore.subscribe((state) => {
  const user = WebApp.initDataUnsafe?.user;
  if (!user) return;
  
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      if (state.items.length === 0) {
        await deleteDoc(doc(db, 'carts', user.id.toString()));
      } else {
        await setDoc(doc(db, 'carts', user.id.toString()), {
          userId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          items: state.items,
          updatedAt: Date.now()
        });
      }
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
  }, 1500);
});
