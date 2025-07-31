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
  console.log('Cleanup entries API called with method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      details: 'Only POST method is supported',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Verify user session and get user ID and role
    const userSession = await verifyUserSession(req.headers.authorization);
    const userId = userSession.user_id;
    const userRole = userSession.role;
    
    console.log('Authenticated user for cleanup:', {
      userId: userId,
      role: userRole,
      username: userSession.username,
      displayName: userSession.display_name
    });
    
    // Only admins can run cleanup
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Not authorized',
        details: 'Only administrators can run cleanup operations',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('Starting cleanup process...');
    
    // 1. Find entries with null or invalid dates
    const { rows: invalidEntries } = await sql`
      SELECT id, customer_name, technician_name, clock_in_time, clock_out_time, created_at
      FROM time_entries 
      WHERE clock_in_time IS NULL 
         OR clock_out_time IS NULL 
         OR clock_in_time > clock_out_time
         OR created_at IS NULL
    `;
    
    console.log(`Found ${invalidEntries.length} entries with invalid dates:`, invalidEntries);
    
    // 2. Find entries older than 30 days (excluding active entries)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { rows: oldEntries } = await sql`
      SELECT id, customer_name, technician_name, clock_in_time, clock_out_time, created_at
      FROM time_entries 
      WHERE created_at < ${thirtyDaysAgo.toISOString()}
         AND (clock_out_time IS NOT NULL OR clock_in_time IS NULL)
    `;
    
    console.log(`Found ${oldEntries.length} entries older than 30 days:`, oldEntries);
    
    // 3. Find duplicate entries (same user, same customer, same day)
    const { rows: duplicateEntries } = await sql`
      SELECT id, customer_name, technician_name, clock_in_time, created_at
      FROM time_entries t1
      WHERE EXISTS (
        SELECT 1 FROM time_entries t2 
        WHERE t2.user_id = t1.user_id 
          AND t2.customer_name = t1.customer_name
          AND t2.id != t1.id
          AND DATE(t2.created_at) = DATE(t1.created_at)
      )
      ORDER BY customer_name, created_at
    `;
    
    console.log(`Found ${duplicateEntries.length} potential duplicate entries:`, duplicateEntries);
    
    // 4. Delete invalid entries
    let deletedCount = 0;
    if (invalidEntries.length > 0) {
      const { rowCount } = await sql`
        DELETE FROM time_entries 
        WHERE clock_in_time IS NULL 
           OR clock_out_time IS NULL 
           OR clock_in_time > clock_out_time
           OR created_at IS NULL
      `;
      deletedCount += rowCount;
      console.log(`Deleted ${rowCount} invalid entries`);
    }
    
    // 5. Delete old entries (optional - uncomment if needed)
    // if (oldEntries.length > 0) {
    //   const { rowCount } = await sql`
    //     DELETE FROM time_entries 
    //     WHERE created_at < ${thirtyDaysAgo.toISOString()}
    //        AND (clock_out_time IS NOT NULL OR clock_in_time IS NULL)
    //   `;
    //   deletedCount += rowCount;
    //   console.log(`Deleted ${rowCount} old entries`);
    // }
    
    // 6. Fix entries with missing job_id or job_assignment_id
    const { rowCount: updatedCount } = await sql`
      UPDATE time_entries 
      SET job_id = NULL, job_assignment_id = NULL
      WHERE job_id IS NOT NULL 
         AND job_id NOT IN (SELECT id FROM jobs)
    `;
    
    console.log(`Updated ${updatedCount} entries with invalid job references`);
    
    // 7. Get summary of remaining entries
    const { rows: summary } = await sql`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN clock_in_time IS NOT NULL AND clock_out_time IS NULL THEN 1 END) as active_entries,
        COUNT(CASE WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL THEN 1 END) as completed_entries,
        COUNT(CASE WHEN clock_in_time IS NULL THEN 1 END) as invalid_entries
      FROM time_entries
    `;
    
    console.log('Cleanup completed successfully');
    
    return res.status(200).json({
      message: 'Cleanup completed successfully',
      deletedCount: deletedCount,
      updatedCount: updatedCount,
      invalidEntriesFound: invalidEntries.length,
      oldEntriesFound: oldEntries.length,
      duplicateEntriesFound: duplicateEntries.length,
      summary: summary[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      error: 'Cleanup failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 