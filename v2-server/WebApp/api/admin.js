const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      case 'debug-entries':
        return await debugTimeEntries(req, res);
      case 'reset-db':
        return await resetDatabase(req, res);
      case 'cleanup-duplicates':
        return await cleanupDuplicates(req, res);
      case 'list-users':
        return await listUsers(req, res);
      case 'fix-passwords':
        return await fixPasswords(req, res);
      case 'init-db':
        return await initDatabase(req, res);
      case 'test-db':
        return await testDatabase(req, res);
      case 'debug-auth':
        return await debugAuth(req, res);
      case 'cleanup-entries':
        return await cleanupEntries(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: [
            'debug-entries', 'reset-db', 'cleanup-duplicates', 
            'list-users', 'fix-passwords', 'init-db', 'test-db', 'debug-auth', 'cleanup-entries'
          ]
        });
    }
  } catch (error) {
    console.error('Admin endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Debug time entries
async function debugTimeEntries(req, res) {
  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT * FROM time_entries ORDER BY created_at DESC
    `;

    res.status(200).json({
      success: true,
      count: rows.length,
      entries: rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        technicianName: row.technician_name,
        customerName: row.customer_name,
        clockInTime: row.clock_in_time,
        clockOutTime: row.clock_out_time,
        lunchStartTime: row.lunch_start_time,
        lunchEndTime: row.lunch_end_time,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: !row.clock_out_time,
        isOnLunch: row.lunch_start_time && !row.lunch_end_time
      }))
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Reset database
async function resetDatabase(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rowCount } = await sql`DELETE FROM time_entries`;
  
  res.status(200).json({
    success: true,
    message: `Database reset complete - deleted ${rowCount} time entries`,
    deletedCount: rowCount
  });
}

// Cleanup duplicates
async function cleanupDuplicates(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows: allEntries } = await sql`
    SELECT id, technician_name, customer_name, clock_in_time, clock_out_time, created_at
    FROM time_entries ORDER BY created_at ASC
  `;

  let deletedCount = 0;
  const groupedEntries = {};

  // Group by technician, customer, and clock-in time (rounded to minute)
  for (const entry of allEntries) {
    const clockInMinute = new Date(entry.clock_in_time);
    clockInMinute.setSeconds(0, 0);
    
    const key = `${entry.technician_name}-${entry.customer_name}-${clockInMinute.toISOString()}`;
    
    if (!groupedEntries[key]) {
      groupedEntries[key] = [];
    }
    groupedEntries[key].push(entry);
  }

  // Keep the most complete entry, delete others
  for (const entries of Object.values(groupedEntries)) {
    if (entries.length > 1) {
      entries.sort((a, b) => {
        const aComplete = !!a.clock_out_time;
        const bComplete = !!b.clock_out_time;
        
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        
        return aComplete && bComplete 
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(b.created_at) - new Date(a.created_at);
      });

      const deleteEntries = entries.slice(1);
      for (const deleteEntry of deleteEntries) {
        await sql`DELETE FROM time_entries WHERE id = ${deleteEntry.id}`;
        deletedCount++;
      }
    }
  }

  res.status(200).json({
    success: true,
    message: `Cleaned up ${deletedCount} duplicate entries`,
    deletedCount
  });
}

// List users
async function listUsers(req, res) {
  const { rows } = await sql`
    SELECT id, username, display_name, email, role, is_active, created_at, last_login
    FROM users ORDER BY created_at DESC
  `;

  res.status(200).json({
    success: true,
    count: rows.length,
    users: rows
  });
}

// Fix passwords
async function fixPasswords(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows: users } = await sql`SELECT id, username, password_hash FROM users`;
  
  let fixedCount = 0;
  for (const user of users) {
    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      const defaultPassword = user.username === 'admin' ? 'admin123' : 'tech123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await sql`
        UPDATE users 
        SET password_hash = ${hashedPassword} 
        WHERE id = ${user.id}
      `;
      
      fixedCount++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Fixed ${fixedCount} user passwords`,
    fixedCount
  });
}

// Initialize database
async function initDatabase(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create tables and default users
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'tech',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS time_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      technician_name VARCHAR(100) NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      clock_in_time TIMESTAMP NOT NULL,
      clock_out_time TIMESTAMP,
      lunch_start_time TIMESTAMP,
      lunch_end_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create default admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  await sql`
    INSERT INTO users (username, display_name, email, password_hash, role)
    VALUES ('admin', 'Administrator', 'admin@icav.com', ${adminHash}, 'admin')
    ON CONFLICT (username) DO NOTHING
  `;

  res.status(200).json({
    success: true,
    message: 'Database initialized successfully'
  });
}

// Test database connection
async function testDatabase(req, res) {
  const { rows: users } = await sql`SELECT COUNT(*) as count FROM users`;
  const { rows: entries } = await sql`SELECT COUNT(*) as count FROM time_entries`;

  res.status(200).json({
    success: true,
    database: 'connected',
    userCount: parseInt(users[0].count),
    entryCount: parseInt(entries[0].count)
  });
}

// Debug authentication
async function debugAuth(req, res) {
  const { rows: users } = await sql`
    SELECT username, display_name, role, is_active, 
           password_hash IS NOT NULL as has_password
    FROM users
  `;

  res.status(200).json({
    success: true,
    users,
    timestamp: new Date().toISOString()
  });
}

// Cleanup entries (consolidated from cleanup-entries.js)
async function cleanupEntries(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user session and get user ID and role
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const { rows: userSession } = await sql`
      SELECT s.user_id, u.id, u.username, u.display_name, u.email, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ${token} 
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;
    
    if (userSession.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const user = userSession[0];
    
    // Only admins can run cleanup
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Not authorized',
        details: 'Only administrators can run cleanup operations'
      });
    }
    
    console.log('Starting cleanup process for user:', user.username);
    
    // 1. Find entries with null or invalid dates
    const { rows: invalidEntries } = await sql`
      SELECT id, customer_name, technician_name, clock_in_time, clock_out_time, created_at
      FROM time_entries 
      WHERE clock_in_time IS NULL 
         OR clock_out_time IS NULL 
         OR clock_in_time > clock_out_time
         OR created_at IS NULL
    `;
    
    // 2. Find entries older than 30 days (excluding active entries)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { rows: oldEntries } = await sql`
      SELECT id, customer_name, technician_name, clock_in_time, clock_out_time, created_at
      FROM time_entries 
      WHERE created_at < ${thirtyDaysAgo.toISOString()}
         AND (clock_out_time IS NOT NULL OR clock_in_time IS NULL)
    `;
    
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
    }
    
    // 5. Fix entries with missing job_id by linking to jobs with matching customer names
    const { rows: entriesWithoutJobId } = await sql`
      SELECT id, customer_name, technician_name, created_at
      FROM time_entries 
      WHERE job_id IS NULL
    `;
    
    let updatedCount = 0;
    for (const entry of entriesWithoutJobId) {
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
          
          // Update the time entry with the job_id
          await sql`
            UPDATE time_entries 
            SET job_id = ${job.id}
            WHERE id = ${entry.id}
          `;
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating time entry ${entry.id}:`, error);
      }
    }
    
    // 6. Get summary of remaining entries
    const { rows: summary } = await sql`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN clock_in_time IS NOT NULL AND clock_out_time IS NULL THEN 1 END) as active_entries,
        COUNT(CASE WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL THEN 1 END) as completed_entries,
        COUNT(CASE WHEN clock_in_time IS NULL THEN 1 END) as invalid_entries
      FROM time_entries
    `;
    
    const responseData = {
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount: deletedCount,
      updatedCount: updatedCount,
      invalidEntriesFound: invalidEntries.length,
      oldEntriesFound: oldEntries.length,
      duplicateEntriesFound: duplicateEntries.length,
      summary: summary[0],
      timestamp: new Date().toISOString()
    };
    
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 