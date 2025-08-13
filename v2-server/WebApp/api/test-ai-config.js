module.exports = async function handler(req, res) {
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
    return res.status(500).json({ 
      error: 'Test failed',
      message: error.message 
    });
  }
};
