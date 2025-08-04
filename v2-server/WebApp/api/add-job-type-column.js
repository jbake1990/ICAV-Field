const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  console.log('Add job_type column API called');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add job_type column if it doesn't exist
    await sql`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'service'
    `;

    // Update existing jobs to map priority to job_type
    await sql`
      UPDATE jobs 
      SET job_type = CASE 
        WHEN priority = 'high' THEN 'quoted'
        WHEN priority = 'medium' THEN 'service'
        WHEN priority = 'low' THEN 'bench'
        ELSE 'service'
      END
      WHERE job_type IS NULL OR job_type = 'service'
    `;

    console.log('Successfully added job_type column and migrated existing data');
    return res.status(200).json({ 
      message: 'Successfully added job_type column and migrated existing data',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding job_type column:', error);
    return res.status(500).json({ error: 'Failed to add job_type column' });
  }
}; 