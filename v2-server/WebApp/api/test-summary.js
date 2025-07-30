const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing time_entries table structure and data...');

    // Check if columns exist
    const columnCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'time_entries' 
      AND column_name IN ('job_notes', 'ai_summary')
      ORDER BY column_name
    `;

    console.log('Column check result:', columnCheck.rows);

    // Check for any entries with job_notes or ai_summary
    const dataCheck = await sql`
      SELECT 
        id,
        customer_name,
        job_notes,
        ai_summary,
        CASE 
          WHEN job_notes IS NOT NULL AND job_notes != '' THEN 'Has job notes'
          ELSE 'No job notes'
        END as job_notes_status,
        CASE 
          WHEN ai_summary IS NOT NULL AND ai_summary != '' THEN 'Has AI summary'
          ELSE 'No AI summary'
        END as ai_summary_status
      FROM time_entries 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    console.log('Data check result:', dataCheck.rows);

    // Count entries with summaries
    const summaryCount = await sql`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN job_notes IS NOT NULL AND job_notes != '' THEN 1 END) as entries_with_job_notes,
        COUNT(CASE WHEN ai_summary IS NOT NULL AND ai_summary != '' THEN 1 END) as entries_with_ai_summary
      FROM time_entries
    `;

    console.log('Summary count result:', summaryCount.rows[0]);

    return res.status(200).json({
      message: 'Time entries table test completed',
      columns: columnCheck.rows,
      recentEntries: dataCheck.rows,
      summary: summaryCount.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing time_entries table:', error);
    return res.status(500).json({
      error: 'Failed to test time_entries table',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 