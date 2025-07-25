const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  try {
    console.log('Setup Techs - Creating sample technician users');
    
    // Sample technician data
    const technicians = [
      { username: 'john.doe', displayName: 'John Doe', email: 'john@icav.com' },
      { username: 'jane.smith', displayName: 'Jane Smith', email: 'jane@icav.com' },
      { username: 'mike.johnson', displayName: 'Mike Johnson', email: 'mike@icav.com' },
      { username: 'sarah.wilson', displayName: 'Sarah Wilson', email: 'sarah@icav.com' },
      { username: 'david.brown', displayName: 'David Brown', email: 'david@icav.com' }
    ];
    
    // Generate a working password hash for "tech123"
    const password = 'tech123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    console.log('Setup Techs - Generated password hash:', passwordHash.substring(0, 10) + '...');
    
    const results = [];
    
    for (const tech of technicians) {
      try {
        // Insert or update technician
        const result = await sql`
          INSERT INTO users (username, display_name, email, password_hash, role, is_active) 
          VALUES (${tech.username}, ${tech.displayName}, ${tech.email}, ${passwordHash}, 'tech', true)
          ON CONFLICT (username) 
          DO UPDATE SET 
            display_name = ${tech.displayName},
            email = ${tech.email},
            is_active = true,
            role = 'tech'
          RETURNING username, display_name, role, is_active
        `;
        
        results.push({
          username: tech.username,
          action: 'created/updated',
          result: result.rows[0]
        });
        
        console.log('Setup Techs - Processed:', tech.username);
        
      } catch (error) {
        console.error('Setup Techs - Error with user:', tech.username, error);
        results.push({
          username: tech.username,
          action: 'error',
          error: error.message
        });
      }
    }
    
    // Verify all active technicians
    const verification = await sql`
      SELECT username, display_name, role, is_active 
      FROM users 
      WHERE role = 'tech' AND is_active = true
      ORDER BY display_name
    `;
    
    console.log('Setup Techs - Final verification:', verification.rows.length, 'active technicians');
    
    res.status(200).json({
      success: true,
      message: 'Technician users setup complete',
      credentials: {
        username: 'any_tech_username',
        password: 'tech123'
      },
      results: results,
      activeTechnicians: verification.rows,
      totalActiveTechs: verification.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Setup Techs - Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}; 