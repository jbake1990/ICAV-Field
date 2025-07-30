const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  console.log('Test Schema API: Checking database structure');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      console.log('Testing database schema...');
      
      // Check if job_assignments table exists
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'job_assignments'
        );
      `;
      
      const tableExists = tableCheck.rows[0].exists;
      console.log('job_assignments table exists:', tableExists);
      
      if (tableExists) {
        // Check table structure
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'job_assignments'
          ORDER BY ordinal_position;
        `;
        
        console.log('Table columns:', columns.rows);
        
        // Try to count records
        const count = await sql`
          SELECT COUNT(*) as count FROM job_assignments;
        `;
        
        console.log('Record count:', count.rows[0].count);
        
        return res.status(200).json({
          tableExists,
          columns: columns.rows,
          recordCount: parseInt(count.rows[0].count),
          message: 'Schema check completed'
        });
      } else {
        return res.status(200).json({
          tableExists: false,
          message: 'job_assignments table does not exist'
        });
      }
    } catch (error) {
      console.error('Schema test error:', error);
      return res.status(500).json({ 
        error: 'Schema test failed', 
        details: error.message 
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 