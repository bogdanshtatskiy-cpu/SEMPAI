import { create } from 'zustand';
import { collection, addDoc, doc, updateDoc, onSnapshot, orderBy, query, where, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';
import { CartItem } from './useCartStore';

export interface Order {
  id: string;
  userId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  items: CartItem[];
  totalPrice: number;
  shippingDetails?: {
    phone: string;
    city: string;
    branch: string;
  };
  status: 'new' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  ttn?: string;
  createdAt: number;
}

interface OrdersState {
  orders: Order[];
  archivedOrders: Order[];
  loading: boolean;
  archivedLoading: boolean;
  hasMoreArchived: boolean;
  lastArchivedDoc: any;
  
  subscribeToActiveOrders: () => () => void;
  loadArchivedOrders: (reset?: boolean) => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  updateOrderStatus: (id: string, status: Order['status'], ttn?: string) => Promise<void>;
  getStats: (days: number) => Promise<{income: number, count: number}>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  archivedOrders: [],
  loading: true,
  archivedLoading: false,
  hasMoreArchived: true,
  lastArchivedDoc: null,
  
  subscribeToActiveOrders: () => {
    set({ loading: true });
    const q = query(
      collection(db, 'orders'), 
      where('status', 'in', ['new', 'processing', 'shipped']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      set({ orders: ordersData, loading: false });
    }, (error) => {
      console.error('Error in onSnapshot (orders):', error);
      set({ loading: false });
    });
    return unsubscribe;
  },

  loadArchivedOrders: async (reset = false) => {
    const { archivedLoading, hasMoreArchived, lastArchivedDoc, archivedOrders } = get();
    if (archivedLoading || (!hasMoreArchived && !reset)) return;

    set({ archivedLoading: true });
    try {
      let q = query(
        collection(db, 'orders'),
        where('status', 'in', ['completed', 'cancelled']),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (!reset && lastArchivedDoc) {
        q = query(q, startAfter(lastArchivedDoc));
      }

      const snapshot = await getDocs(q);
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      set({
        archivedOrders: reset ? newOrders : [...archivedOrders, ...newOrders],
        lastArchivedDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMoreArchived: snapshot.docs.length === 20,
        archivedLoading: false
      });
    } catch (error) {
      console.error('Error fetching archived orders:', error);
      set({ archivedLoading: false });
    }
  },

  getStats: async (days: number) => {
    const timeAgo = Date.now() - (days * 24 * 60 * 60 * 1000);
    try {
      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'completed'),
        where('createdAt', '>=', timeAgo)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.reduce((sum, doc) => {
        return {
          income: sum.income + (doc.data().totalPrice || 0),
          count: sum.count + 1
        };
      }, { income: 0, count: 0 });
    } catch (e) {
      console.error('Error fetching stats:', e);
      return { income: 0, count: 0 };
    }
  },

  createOrder: async (orderData) => {
    try {
      const newOrder = {
        ...orderData,
        status: 'new',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'orders'), newOrder);
      return true;
    } catch (error) {
      console.error('Error creating order:', error);
      return false;
    }
  },

  updateOrderStatus: async (id, status, ttn) => {
    try {
      const orderRef = doc(db, 'orders', id);
      const updateData: any = { status };
      if (ttn !== undefined) {
        updateData.ttn = ttn;
      }
      await updateDoc(orderRef, updateData);
      
      // If status changed to archive, maybe reload archive if we were on it
      // but for now let's just let it be.
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }
}));
