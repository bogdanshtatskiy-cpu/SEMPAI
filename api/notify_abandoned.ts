export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { cart } = req.body;
  
  if (!cart || !cart.userId) {
    return res.status(400).json({ error: 'No cart data provided' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('Missing TELEGRAM_BOT_TOKEN');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const itemsText = cart.items.map((item: any) => 
    `- ${item.title} ${item.selectedColor ? `(${item.selectedColor})` : ''} x${item.quantity}`
  ).join('\n');

  const text = `Привет, ${cart.firstName}! 👋

Вы оставили товары в корзине:
${itemsText}

Оформите заказ сейчас, пока товары в наличии! 👇`;

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cart.userId,
        text: text,
      }),
    });

    if (!telegramResponse.ok) {
      throw new Error(`Telegram API Error: ${telegramResponse.statusText}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending abandoned cart notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
