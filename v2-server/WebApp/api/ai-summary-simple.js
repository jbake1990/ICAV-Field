const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'AI service not configured - missing OpenAI API key' });
    }

    const { notes, customerName } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    // For now, just return a test response
    const testSummary = `**Customer Info:** ${customerName || 'Test Customer'}

**Work Summary:** 
This is a test summary generated for the provided notes: "${notes}"

**To-Do/Follow Up:** 
- [ ] Test the AI summary functionality
- [ ] Verify the endpoint is working correctly

This is a placeholder response while we debug the OpenAI integration.`;

    return res.status(200).json({ 
      summary: testSummary,
      message: 'Test summary generated successfully',
      hasOpenAIKey: !!openaiApiKey,
      keyLength: openaiApiKey ? openaiApiKey.length : 0
    });

  } catch (error) {
    console.error('AI Summary Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message,
      stack: error.stack
    });
  }
};
