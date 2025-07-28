const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    // Test 1: Basic response
    console.log('Simple test: Starting...');
    
    // Test 2: Database connection
    console.log('Simple test: Testing database...');
    const result = await sql`SELECT 1 as test`;
    console.log('Simple test: Database works!', result.rows[0]);
    
    return res.status(200).json({
      status: 'success',
      test: result.rows[0].test,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack?.split('\n')[0] || 'No stack trace'
    });
  }
}; 