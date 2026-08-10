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
    const { modelName, calledMethod, methodProperties } = req.body;
    
    // Белый список разрешенных методов для клиента
    const allowedMethods = ['searchSettlements', 'getWarehouses'];
    if (!allowedMethods.includes(calledMethod)) {
      return res.status(403).json({ error: 'Forbidden method' });
    }

    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        modelName,
        calledMethod,
        methodProperties
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('NP API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from Nova Poshta' });
  }
}
