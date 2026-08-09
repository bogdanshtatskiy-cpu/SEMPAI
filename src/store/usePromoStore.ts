import { create } from 'zustand';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  expiresAt?: number; // timestamp
  usageLimit?: number;
  usageCount: number;
}

interface PromoState {
  promos: PromoCode[];
  loading: boolean;
  subscribeToPromos: () => () => void;
  addPromo: (promo: Omit<PromoCode, 'id' | 'usageCount'>) => Promise<void>;
  deletePromo: (id: string) => Promise<void>;
  usePromo: (code: string) => Promise<boolean>;
}

export const usePromoStore = create<PromoState>((set, get) => ({
  promos: [],
  loading: true,

  subscribeToPromos: () => {
    const q = collection(db, 'promocodes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PromoCode[];
      set({ promos: data, loading: false });
    }, (error) => {
      console.error('Error fetching promos:', error);
      set({ loading: false });
    });
    return unsubscribe;
  },

  addPromo: async (promoData) => {
    try {
      await addDoc(collection(db, 'promocodes'), {
        ...promoData,
        code: promoData.code.toUpperCase(),
        usageCount: 0
      });
    } catch (error) {
      console.error('Error adding promo:', error);
    }
  },

  deletePromo: async (id) => {
    try {
      await deleteDoc(doc(db, 'promocodes', id));
    } catch (error) {
      console.error('Error deleting promo:', error);
    }
  },

  usePromo: async (code) => {
    const promo = get().promos.find(p => p.code === code.toUpperCase());
    if (!promo) return false;
    if (promo.expiresAt && Date.now() > promo.expiresAt) return false;
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) return false;

    // Increment usage
    try {
      await updateDoc(doc(db, 'promocodes', promo.id), {
        usageCount: promo.usageCount + 1
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}));
