const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    console.log('Debug: Starting comprehensive check...');
    
    // Test 1: Basic connection test
    const basicTest = await sql`SELECT NOW() as current_time, 1 as test`;
    console.log('✅ Database connection works');
    
    // Test 2: List all tables
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('✅ Got table list:', allTables.rows.length, 'tables');
    
    // Test 3: Check specific tables
    const tableNames = allTables.rows.map(row => row.table_name);
    const hasJobs = tableNames.includes('jobs');
    const hasJobAssignments = tableNames.includes('job_assignments');
    const hasUsers = tableNames.includes('users');
    const hasTimeEntries = tableNames.includes('time_entries');
    const hasAIUsageLog = tableNames.includes('ai_usage_log');
    
    console.log('Table check:', { hasJobs, hasJobAssignments, hasUsers, hasTimeEntries, hasAIUsageLog });
    
    // Test 4: Query table counts
    const tableCounts = {};
    const tableErrors = {};
    
    const tablesToCheck = ['users', 'jobs', 'job_assignments', 'time_entries', 'ai_usage_log'];
    
    for (const tableName of tablesToCheck) {
      if (tableNames.includes(tableName)) {
        try {
          const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
          tableCounts[tableName] = parseInt(result.rows[0].count);
          console.log(`✅ ${tableName} table has ${tableCounts[tableName]} records`);
        } catch (error) {
          tableErrors[tableName] = error.message;
          console.log(`❌ ${tableName} table query failed:`, error.message);
        }
      } else {
        tableCounts[tableName] = null;
        tableErrors[tableName] = 'Table not found';
      }
    }
    
    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: basicTest.rows[0].current_time,
        testValue: basicTest.rows[0].test
      },
      tables: {
        total: allTables.rows.length,
        list: tableNames,
        required: {
          users: hasUsers,
          jobs: hasJobs,
          job_assignments: hasJobAssignments,
          time_entries: hasTimeEntries,
          ai_usage_log: hasAIUsageLog
        }
      },
      data: {
        counts: tableCounts,
        errors: tableErrors
      }
    };
    
    console.log('Debug result summary:', {
      tablesFound: tableNames.length,
      hasAllRequiredTables: hasUsers && hasJobs && hasJobAssignments && hasTimeEntries && hasAIUsageLog,
      totalErrors: Object.keys(tableErrors).filter(key => tableErrors[key] !== 'Table not found').length
    });
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Debug - Critical error:', error);
    return res.status(500).json({ 
      status: 'error',
      error: error.message,
      code: error.code,
      detail: error.detail || 'No additional details',
      stack: error.stack?.split('\n')[0] || 'No stack trace',
      timestamp: new Date().toISOString()
    });
  }
};
