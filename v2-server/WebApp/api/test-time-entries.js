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
    
    // Get basic sample data first
    const basicData = await sql`
      SELECT id, customer_name, technician_name, clock_in_time, clock_out_time
      FROM time_entries 
      ORDER BY clock_in_time DESC 
      LIMIT 1
    `;
    
    let sampleEntry = basicData.rows[0] || null;
    
    // If we have AI columns and an entry, try to get those fields separately
    if (sampleEntry && hasJobNotes && hasAiSummary) {
      try {
        const aiData = await sql`
          SELECT job_notes, ai_summary
          FROM time_entries 
          WHERE id = ${sampleEntry.id}
        `;
        if (aiData.rows[0]) {
          sampleEntry.job_notes = aiData.rows[0].job_notes;
          sampleEntry.ai_summary = aiData.rows[0].ai_summary;
        }
      } catch (aiError) {
        console.log('Could not fetch AI data:', aiError.message);
      }
    }
    
    console.log('Sample entry:', sampleEntry);
    
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
        sampleEntry
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