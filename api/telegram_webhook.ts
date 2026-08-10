import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message } = req.body;
  if (!message || !message.text || !message.from) return res.status(200).json({ success: true });

  const telegramId = message.from.id;
  const text = message.text;
  const username = message.from.username;

  // Sign in as admin to bypass rules for reading orders and writing reviews
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
  const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

  try {
    if (adminEmail && adminPassword) {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    }
    
    // Check if user has a completed order
    const q = query(collection(db, 'orders'), where('userId', '==', telegramId), where('status', '==', 'completed'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return res.status(200).json({ success: true }); // Ignore messages from users without completed orders
    }

    // Save review to firestore
    await addDoc(collection(db, 'reviews'), {
      userId: telegramId,
      username: username || '',
      firstName: message.from.first_name || '',
      text: text,
      createdAt: Date.now()
    });

    // Forward to reviews channel
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.REVIEWS_CHANNEL_ID;

    if (token && channelId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: `📝 *Новий відгук!*\nВід: ${message.from.first_name} ${username ? `(@${username})` : ''}\n\n"${text}"`,
          parse_mode: 'Markdown'
        })
      });
      
      // Reply to user
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `Дякуємо! Ваш відгук успішно збережено та опубліковано ❤️`
        })
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
