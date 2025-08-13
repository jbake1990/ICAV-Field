export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    return res.status(200).json({
      status: 'success',
      hasOpenAIKey: !!openaiApiKey,
      keyLength: openaiApiKey ? openaiApiKey.length : 0,
      keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : 'none',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test AI Config Error:', error);
    return res.status(500).json({ error: 'Failed to check configuration' });
  }
}
