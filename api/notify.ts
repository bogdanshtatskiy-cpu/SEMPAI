import crypto from 'crypto';

// Вспомогательная функция для проверки Telegram initData
function verifyInitData(telegramInitData: string, botToken: string): boolean {
  try {
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
  } catch (e) {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { order, initData } = req.body;

  if (!order || !initData) {
    return res.status(400).json({ error: 'No order data or initData provided' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_TELEGRAM_ID;

  if (!token || !adminId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_ID');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!verifyInitData(initData, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Telegram Data' });
  }

  const itemsText = order.items.map((item: any) =>
    `- ${item.title} ${item.selectedColor ? `(${item.selectedColor})` : ''} x${item.quantity}`
  ).join('\n');

  const text = `🚨 *НОВЕ ЗАМОВЛЕННЯ!* 🚨
Від: ${order.firstName} ${order.lastName || ''} ${order.username ? `(@${order.username})` : ''}

*Доставка (НП):*
📞 ${order.shippingDetails?.phone || 'Не вказано'}
📍 ${order.shippingDetails?.city || 'Не вказано'}, Відд. ${order.shippingDetails?.branch || 'Не вказано'}

*Товари:*
${itemsText}

*Сума:* ₴ ${order.totalPrice}

Відкрийте Адмін-панель для перегляду деталей.`;

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: adminId,
        text: text,
        parse_mode: 'Markdown',
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
