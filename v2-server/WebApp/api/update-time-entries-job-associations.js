const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  console.log(`Update Time Entries Job Associations API: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'POST') {
      console.log('Updating time entries with job associations...');
      
      // Get all time entries that don't have job_id set
      const { rows: timeEntries } = await sql`
        SELECT id, customer_name, technician_name, created_at
        FROM time_entries 
        WHERE job_id IS NULL
        ORDER BY created_at DESC
      `;
      
      console.log(`Found ${timeEntries.length} time entries without job associations`);
      
      let updatedCount = 0;
      let errors = [];
      
      for (const entry of timeEntries) {
        try {
          // Find a job with matching customer name
          const { rows: jobs } = await sql`
            SELECT id, customer_name, title
            FROM jobs 
            WHERE customer_name ILIKE ${entry.customer_name}
            ORDER BY created_at DESC
            LIMIT 1
          `;
          
          if (jobs.length > 0) {
            const job = jobs[0];
            console.log(`Linking time entry ${entry.id} (${entry.customer_name}) to job ${job.id} (${job.customer_name})`);
            
            // Update the time entry with the job_id
            await sql`
              UPDATE time_entries 
              SET job_id = ${job.id}
              WHERE id = ${entry.id}
            `;
            
            updatedCount++;
          } else {
            console.log(`No matching job found for time entry ${entry.id} (${entry.customer_name})`);
            errors.push(`No job found for customer: ${entry.customer_name}`);
          }
        } catch (error) {
          console.error(`Error updating time entry ${entry.id}:`, error);
          errors.push(`Error updating entry ${entry.id}: ${error.message}`);
        }
      }
      
      console.log(`Updated ${updatedCount} time entries with job associations`);
      
      return res.status(200).json({
        success: true,
        message: `Updated ${updatedCount} time entries with job associations`,
        updatedCount,
        totalEntries: timeEntries.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Update time entries job associations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 