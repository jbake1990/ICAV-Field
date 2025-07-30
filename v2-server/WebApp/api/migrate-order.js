const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  console.log('Migration API: Adding order column to job_assignments');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify the session token and get user info
    const sessionQuery = await sql`
      SELECT s.user_id, u.username, u.display_name, u.role, u.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ${token} AND s.expires_at > NOW()
    `;

    if (sessionQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = sessionQuery.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Only admins can run migrations
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'POST') {
      return await runMigration(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Migration API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function runMigration(req, res) {
  try {
    console.log('Starting migration: Adding order column to job_assignments');
    
    // Add order column
    await sql`ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS "order" INTEGER`;
    console.log('✓ Added order column');
    
    // Create index
    await sql`CREATE INDEX IF NOT EXISTS idx_job_assignments_order ON job_assignments("order")`;
    console.log('✓ Created order index');
    
    // Update existing assignments with default order values
    const updateResult = await sql`
      UPDATE job_assignments 
      SET "order" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY user_id, assigned_date 
          ORDER BY created_at
        ) as row_num
        FROM job_assignments
      ) as subquery
      WHERE job_assignments.id = subquery.id
    `;
    console.log(`✓ Updated ${updateResult.rowCount} existing assignments with order values`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Migration completed successfully',
      updatedAssignments: updateResult.rowCount
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error.message 
    });
  }
} 