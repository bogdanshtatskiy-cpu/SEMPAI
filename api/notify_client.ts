export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, orderId, status, ttn } = req.body;

  if (!userId || !status) {
    return res.status(400).json({ error: 'Missing userId or status' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('Missing TELEGRAM_BOT_TOKEN');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let text = '';
  switch (status) {
    case 'processing':
      text = `⏳ Ваше замовлення #${orderId.slice(0, 5)} взято в роботу!`;
      break;
    case 'shipped':
      text = `📦 Ваше замовлення #${orderId.slice(0, 5)} відправлено!\n\nНомер ТТН: ${ttn || 'Уточнюється'}\nПосилка вже прямує до вас!`;
      break;
    case 'completed':
      text = `✅ Ваше замовлення #${orderId.slice(0, 5)} успішно виконано! Дякуємо, що обрали нас.\n\nБудь ласка, напишіть ваш відгук прямо сюди, у чат з ботом 👇`;
      break;
    case 'cancelled':
      text = `❌ Ваше замовлення #${orderId.slice(0, 5)} скасовано. Якщо у вас є питання, зверніться до підтримки.`;
      break;
    default:
      return res.status(200).json({ success: true, ignored: true });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: userId,
        text: text,
      }),
    });

    if (!telegramResponse.ok) {
      throw new Error(`Telegram API Error: ${telegramResponse.statusText}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
