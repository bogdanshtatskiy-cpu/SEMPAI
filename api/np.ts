export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.NOVA_POSHTA_API_KEY;

  if (!apiKey) {
    console.error('Missing NOVA_POSHTA_API_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // В req.body клиент передает { modelName, calledMethod, methodProperties }
    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        ...req.body
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('NP API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from Nova Poshta' });
  }
}
