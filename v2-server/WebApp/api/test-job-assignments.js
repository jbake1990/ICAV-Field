const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing job assignments with date filtering...');

    // Get all job assignments with their dates
    const allAssignments = await sql`
      SELECT 
        ja.id,
        ja.job_id,
        ja.user_id,
        ja.technician_name,
        ja.assigned_date,
        ja.status,
        j.title as job_title,
        j.customer_name as job_customer_name,
        j.created_at as job_created_at
      FROM job_assignments ja
      LEFT JOIN jobs j ON ja.job_id = j.id
      ORDER BY ja.assigned_date DESC
    `;

    console.log('All assignments:', allAssignments.rows);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);

    // Test filtering by today's date
    const todayAssignments = await sql`
      SELECT 
        ja.id,
        ja.job_id,
        ja.user_id,
        ja.technician_name,
        ja.assigned_date,
        ja.status,
        j.title as job_title,
        j.customer_name as job_customer_name
      FROM job_assignments ja
      LEFT JOIN jobs j ON ja.job_id = j.id
      WHERE ja.assigned_date = ${today}
      ORDER BY ja.assigned_date DESC
    `;

    console.log('Today\'s assignments:', todayAssignments.rows);

    // Check for assignments with different date formats
    const dateFormats = await sql`
      SELECT DISTINCT 
        assigned_date,
        assigned_date::text as date_text
      FROM job_assignments
      ORDER BY assigned_date DESC
      LIMIT 10
    `;

    console.log('Date formats found:', dateFormats.rows);

    return res.status(200).json({
      message: 'Job assignments test completed',
      today: today,
      allAssignments: allAssignments.rows,
      todayAssignments: todayAssignments.rows,
      dateFormats: dateFormats.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing job assignments:', error);
    return res.status(500).json({
      error: 'Failed to test job assignments',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 