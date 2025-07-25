const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  try {
    console.log('Fix Admin - Starting admin user fix');
    
    // Generate a fresh hash for "admin123" using the working bcrypt version
    const password = 'admin123';
    const freshHash = await bcrypt.hash(password, 10);
    
    console.log('Fix Admin - Generated hash:', freshHash);
    console.log('Fix Admin - Hash format:', freshHash.substring(0, 7));
    
    // Test the hash immediately
    const testResult = await bcrypt.compare(password, freshHash);
    console.log('Fix Admin - Hash verification test:', testResult);
    
    if (!testResult) {
      throw new Error('Generated hash failed verification test');
    }
    
    // Update or create admin user
    const result = await sql`
      INSERT INTO users (username, display_name, email, password_hash, role, is_active) 
      VALUES ('admin', 'System Administrator', 'admin@icav.com', ${freshHash}, 'admin', true)
      ON CONFLICT (username) 
      DO UPDATE SET 
        password_hash = ${freshHash},
        is_active = true,
        display_name = 'System Administrator',
        role = 'admin'
      RETURNING username, display_name, role, is_active
    `;
    
    console.log('Fix Admin - Database update result:', result.rows[0]);
    
    // Verify the update worked by querying back
    const verification = await sql`
      SELECT username, display_name, role, is_active, 
             length(password_hash) as hash_length,
             substring(password_hash, 1, 10) as hash_start
      FROM users WHERE username = 'admin'
    `;
    
    console.log('Fix Admin - Verification query result:', verification.rows[0]);
    
    // Test the password against the stored hash
    const storedHash = await sql`SELECT password_hash FROM users WHERE username = 'admin'`;
    const finalTest = await bcrypt.compare(password, storedHash.rows[0].password_hash);
    
    console.log('Fix Admin - Final bcrypt test with stored hash:', finalTest);
    
    res.status(200).json({
      success: true,
      message: 'Admin user fixed successfully',
      credentials: {
        username: 'admin',
        password: 'admin123'
      },
      verification: {
        userExists: verification.rows.length > 0,
        userActive: verification.rows[0]?.is_active,
        hashLength: verification.rows[0]?.hash_length,
        hashFormat: verification.rows[0]?.hash_start,
        bcryptTest: finalTest
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Fix Admin - Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}; 