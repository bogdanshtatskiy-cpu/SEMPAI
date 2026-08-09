import { create } from 'zustand';
import { collection, addDoc, doc, updateDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
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
  status: 'new' | 'processing' | 'completed' | 'cancelled';
  createdAt: number;
}

interface OrdersState {
  orders: Order[];
  loading: boolean;
  subscribeToOrders: () => () => void;
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  loading: true,
  
  subscribeToOrders: () => {
    set({ loading: true });
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
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

  updateOrderStatus: async (id, status) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }
}));
