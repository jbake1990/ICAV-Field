const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  console.log('Add Order Column API: Adding order column to job_assignments');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('Adding order column to job_assignments table...');
      
      // Add order column
      await sql`ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS "order" INTEGER`;
      console.log('✓ Added order column');
      
      // Create index for better performance
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
        message: 'Order column added successfully',
        updatedAssignments: updateResult.rowCount
      });
    } catch (error) {
      console.error('Failed to add order column:', error);
      return res.status(500).json({ 
        error: 'Failed to add order column', 
        details: error.message 
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 