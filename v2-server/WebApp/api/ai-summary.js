const { sql } = require('@vercel/postgres');

// Helper function to verify user session and get user ID
async function verifyUserSession(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  const { rows } = await sql`
    SELECT s.user_id, u.id, u.username, u.display_name, u.email, u.role
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ${token} 
      AND s.expires_at > NOW()
      AND u.is_active = true
  `;
  
  if (rows.length === 0) {
    throw new Error('Invalid or expired session');
  }
  
  return rows[0];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = await verifyUserSession(req.headers.authorization);

    const { notes, customerName } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    // Get OpenAI API key from environment variable
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Generate AI summary
    const summary = await generateAISummary(notes, customerName || '', openaiApiKey);

    // Log the AI usage for monitoring (with error handling for missing table)
    try {
      await sql`
        INSERT INTO ai_usage_log (user_id, notes_length, timestamp)
        VALUES (${user.user_id}, ${notes.length}, NOW())
      `;
    } catch (error) {
      console.warn('Could not log AI usage (table may not exist):', error.message);
      // Continue without logging - this is not critical for the summary generation
    }

    return res.status(200).json({ summary });

  } catch (error) {
    console.error('AI Summary Error:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
}

async function generateAISummary(notes, customerName, apiKey) {
  const customerContext = customerName ? `Customer: ${customerName}\n` : '';
  
  const prompt = `
${customerContext}Technician Notes: ${notes}

Transform these brief technician notes into a comprehensive, professional job summary for internal documentation and potential client communication. The summary should be detailed enough to understand exactly what work was performed and what follow-up actions are needed.

Please create a detailed job summary with the following format:

**Customer Info:** [Extract or use provided customer name, or "Not specified" if not found]

**Work Summary:** 
[Write a brief paragraph explaining the overall work performed, then include bullet points with specific details about what was accomplished. Expand on technical abbreviations, explain the purpose of each task, and describe any issues that were identified and resolved. Use clear, professional language suitable for both technical and non-technical audiences.]

**To-Do/Follow Up:** 
[Create a checklist of specific to-do items or follow-up actions needed. Each item should be a separate bullet point starting with "- [ ]". If no follow-up is required, simply write "None". Be specific about what needs to be done, when it should be completed, and who should do it.]

Guidelines:
- Write in third-person, professional documentation style
- Avoid using "you", "your", or other second-person language
- Explain technical terms in clear language
- Be specific about what was accomplished
- Provide context for why work was necessary
- Give clear expectations for any follow-up
- Maintain a professional, informative tone
- Include timeframes when relevant
- Mention any testing or verification performed
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical writer who creates detailed, professional job summaries that can be shared with customers. Your role is to transform brief technician notes into comprehensive, customer-friendly reports that explain what work was performed and what follow-up actions are needed.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const summary = data.choices[0]?.message?.content;

  if (!summary) {
    throw new Error('No summary generated from OpenAI');
  }

  return summary;
}
