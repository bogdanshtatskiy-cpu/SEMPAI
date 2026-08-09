export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { order } = req.body;
  
  if (!order) {
    return res.status(400).json({ error: 'No order data provided' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_TELEGRAM_ID;

  if (!token || !adminId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_ID');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const itemsText = order.items.map((item: any) => 
    `- ${item.title} ${item.selectedColor ? `(${item.selectedColor})` : ''} x${item.quantity}`
  ).join('\n');

  const text = `🚨 *НОВЫЙ ЗАКАЗ!* 🚨
От: ${order.firstName} ${order.lastName || ''} ${order.username ? `(@${order.username})` : ''}

*Товары:*
${itemsText}

*Сумма:* ₴ ${order.totalPrice}

Откройте Админ-панель для просмотра деталей.`;

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
