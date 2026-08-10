import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import crypto from 'crypto';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Вспомогательная функция для проверки Telegram initData
function verifyInitData(telegramInitData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calculatedHash === hash;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { initData, userId } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
  const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

  if (!initData || !userId || !token) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // 1. Проверяем, что запрос реально пришел от Telegram
  if (!verifyInitData(initData, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Telegram Data' });
  }

  // 2. Достаем ID пользователя из initData, чтобы убедиться, что он просит СВОИ заказы
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get('user');
  if (!userStr) return res.status(401).json({ error: 'Unauthorized: No User Data' });
  
  const userData = JSON.parse(userStr);
  if (String(userData.id) !== String(userId)) {
    return res.status(403).json({ error: 'Forbidden: You can only request your own orders' });
  }

  // 3. Логинимся в Firebase под Админом на сервере (чтобы обойти Security Rules)
  try {
    if (adminEmail && adminPassword) {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } else {
      console.warn("FIREBASE_ADMIN_EMAIL/PASSWORD are not set. Attempting fetch without auth (might fail due to rules).");
    }

    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', Number(userId))
    );
    
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Сортируем в памяти, чтобы не требовать создания Composite Index в Firestore
    orders.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
}
