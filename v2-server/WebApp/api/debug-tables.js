const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    console.log('Debug Tables: Starting simple check');
    
    // Step 1: Test basic connection
    const basicTest = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection works');
    
    // Step 2: List all tables
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('✅ Got table list:', allTables.rows.length, 'tables');
    
    // Step 3: Check specific tables
    const tableNames = allTables.rows.map(row => row.table_name);
    const hasJobs = tableNames.includes('jobs');
    const hasJobAssignments = tableNames.includes('job_assignments');
    const hasUsers = tableNames.includes('users');
    
    console.log('Table check:', { hasJobs, hasJobAssignments, hasUsers });
    
    // Step 4: If jobs table exists, try to query it
    let jobsCount = null;
    let jobsError = null;
    if (hasJobs) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM jobs`;
        jobsCount = result.rows[0].count;
        console.log('✅ Jobs table has', jobsCount, 'records');
      } catch (error) {
        jobsError = error.message;
        console.log('❌ Jobs table query failed:', error.message);
      }
    }
    
    // Step 5: If job_assignments table exists, try to query it
    let assignmentsCount = null;
    let assignmentsError = null;
    if (hasJobAssignments) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM job_assignments`;
        assignmentsCount = result.rows[0].count;
        console.log('✅ Job assignments table has', assignmentsCount, 'records');
      } catch (error) {
        assignmentsError = error.message;
        console.log('❌ Job assignments table query failed:', error.message);
      }
    }
    
    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: basicTest.rows[0].current_time
      },
      tables: {
        total: allTables.rows.length,
        list: tableNames,
        required: {
          users: hasUsers,
          jobs: hasJobs,
          job_assignments: hasJobAssignments
        }
      },
      data: {
        jobs: { count: jobsCount, error: jobsError },
        assignments: { count: assignmentsCount, error: assignmentsError }
      }
    };
    
    console.log('Debug result summary:', {
      tablesFound: tableNames.length,
      hasJobsTables: hasJobs && hasJobAssignments,
      errors: { jobs: !!jobsError, assignments: !!assignmentsError }
    });
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Debug Tables - Critical error:', error);
    return res.status(500).json({ 
      status: 'error',
      error: error.message,
      code: error.code,
      detail: error.detail || 'No additional details',
      timestamp: new Date().toISOString()
    });
  }
}; 