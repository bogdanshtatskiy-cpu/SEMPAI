import { create } from 'zustand';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from './useCartStore';

interface ProductsState {
  products: Product[];
  loading: boolean;
  subscribeToProducts: () => () => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  loading: true,
  subscribeToProducts: () => {
    set({ loading: true });
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      set({ products: productsData, loading: false });
    }, (error) => {
      console.error('Error in onSnapshot:', error);
      set({ loading: false });
    });
    return unsubscribe;
  },
  addProduct: async (product) => {
    try {
      await addDoc(collection(db, 'products'), product);
      // onSnapshot automatically updates the local state, so we don't need to manually update it here
    } catch (error) {
      console.error('Error adding product:', error);
    }
  },
  deleteProduct: async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      // onSnapshot automatically updates the local state
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }
}));
