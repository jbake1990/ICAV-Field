import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log('Debug Tables: Checking database structure');
  
  try {
    // Check if jobs table exists
    console.log('Checking if jobs table exists...');
    const jobsTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs'
    `;
    
    // Check if job_assignments table exists
    console.log('Checking if job_assignments table exists...');
    const assignmentsTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'job_assignments'
    `;
    
    // List all tables
    console.log('Listing all tables...');
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    // Check if job_status enum exists
    console.log('Checking if job_status enum exists...');
    const jobStatusEnum = await sql`
      SELECT typname 
      FROM pg_type 
      WHERE typname = 'job_status'
    `;
    
    // Try a simple jobs query to see the exact error
    let jobsQueryError = null;
    try {
      console.log('Testing jobs query...');
      await sql`SELECT COUNT(*) FROM jobs`;
    } catch (error) {
      jobsQueryError = {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      };
      console.error('Jobs query error:', jobsQueryError);
    }
    
    // Try a simple job_assignments query to see the exact error
    let assignmentsQueryError = null;
    try {
      console.log('Testing job_assignments query...');
      await sql`SELECT COUNT(*) FROM job_assignments`;
    } catch (error) {
      assignmentsQueryError = {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      };
      console.error('Job assignments query error:', assignmentsQueryError);
    }
    
    const result = {
      tablesFound: {
        jobs: jobsTableCheck.rows.length > 0,
        job_assignments: assignmentsTableCheck.rows.length > 0
      },
      allTables: allTables.rows.map(row => row.table_name),
      enumsFound: {
        job_status: jobStatusEnum.rows.length > 0
      },
      queryErrors: {
        jobs: jobsQueryError,
        job_assignments: assignmentsQueryError
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('Debug result:', JSON.stringify(result, null, 2));
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Debug Tables error:', error);
    return res.status(500).json({ 
      error: 'Debug failed',
      message: error.message,
      code: error.code,
      detail: error.detail,
      timestamp: new Date().toISOString()
    });
  }
} 