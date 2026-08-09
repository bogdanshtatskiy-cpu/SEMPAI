import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface FavoritesState {
  favorites: string[];
  loading: boolean;
  loadFavorites: (userId: number) => Promise<void>;
  toggleFavorite: (userId: number, productId: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,

  loadFavorites: async (userId) => {
    set({ loading: true });
    try {
      const docRef = doc(db, 'favorites', userId.toString());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        set({ favorites: docSnap.data().items || [] });
      } else {
        set({ favorites: [] });
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      set({ loading: false });
    }
  },

  toggleFavorite: async (userId, productId) => {
    const { favorites } = get();
    const isFav = favorites.includes(productId);
    const newFavorites = isFav 
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    set({ favorites: newFavorites }); // Optimistic update

    try {
      const docRef = doc(db, 'favorites', userId.toString());
      await setDoc(docRef, { items: newFavorites }, { merge: true });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      set({ favorites });
    }
  }
}));
