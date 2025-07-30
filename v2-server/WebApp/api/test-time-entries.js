const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    console.log('Testing time_entries table structure and data...');
    
    // Check table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'time_entries' 
      ORDER BY ordinal_position
    `;
    
    console.log('Time entries columns:', columns.rows);
    
    // Check if we have ai_summary and job_notes columns
    const columnNames = columns.rows.map(col => col.column_name);
    const hasJobNotes = columnNames.includes('job_notes');
    const hasAiSummary = columnNames.includes('ai_summary');
    
    console.log('Has job_notes column:', hasJobNotes);
    console.log('Has ai_summary column:', hasAiSummary);
    
    // Get count of entries
    const countResult = await sql`SELECT COUNT(*) as total FROM time_entries`;
    const totalEntries = countResult.rows[0].total;
    
    console.log('Total time entries:', totalEntries);
    
    // Get sample data (first entry)
    const sampleData = await sql`
      SELECT id, customer_name, technician_name, 
             ${hasJobNotes ? sql`job_notes,` : sql``}
             ${hasAiSummary ? sql`ai_summary,` : sql``}
             clock_in_time, clock_out_time
      FROM time_entries 
      ORDER BY clock_in_time DESC 
      LIMIT 1
    `;
    
    console.log('Sample entry:', sampleData.rows[0]);
    
    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      structure: {
        totalColumns: columns.rows.length,
        columns: columns.rows,
        hasJobNotes,
        hasAiSummary
      },
      data: {
        totalEntries,
        sampleEntry: sampleData.rows[0] || null
      }
    });
    
  } catch (error) {
    console.error('Test time entries error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};