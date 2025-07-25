const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  console.log('Auth Debug - Method:', req.method);
  console.log('Auth Debug - Body:', JSON.stringify(req.body, null, 2));

  if (req.method === 'POST') {
    const { action, username, password } = req.body;
    
    console.log('Auth Debug - Action:', action);
    console.log('Auth Debug - Username:', username);
    console.log('Auth Debug - Password provided:', !!password);

    if (action === 'login') {
      try {
        console.log('Auth Debug - Starting login process');
        
        // Find user by username
        console.log('Auth Debug - Querying for user:', username);
        const { rows } = await sql`
          SELECT id, username, display_name, email, password_hash, role, is_active
          FROM users 
          WHERE username = ${username} AND is_active = true
        `;

        console.log('Auth Debug - Query result count:', rows.length);
        if (rows.length > 0) {
          const user = rows[0];
          console.log('Auth Debug - Found user:', {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            is_active: user.is_active,
            has_password_hash: !!user.password_hash,
            password_hash_length: user.password_hash?.length,
            password_hash_starts_with: user.password_hash?.substring(0, 10)
          });

          // Test bcrypt
          console.log('Auth Debug - Testing bcrypt with password:', password);
          console.log('Auth Debug - Against hash:', user.password_hash);
          
          const isValidPassword = await bcrypt.compare(password, user.password_hash);
          console.log('Auth Debug - Bcrypt result:', isValidPassword);
          
          if (!isValidPassword) {
            console.log('Auth Debug - Password verification failed');
            return res.status(401).json({ 
              error: 'Invalid username or password',
              debug: {
                userFound: true,
                hasPasswordHash: !!user.password_hash,
                bcryptResult: isValidPassword
              }
            });
          }

          console.log('Auth Debug - Password verified successfully');

          // Generate session token
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          console.log('Auth Debug - Creating session token');
          
          // Store session
          await sql`
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (${user.id}, ${token}, ${expiresAt})
          `;

          // Update last login
          await sql`
            UPDATE users 
            SET last_login = NOW()
            WHERE id = ${user.id}
          `;

          console.log('Auth Debug - Login successful, returning response');

          // Return user data and token
          return res.status(200).json({
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              email: user.email,
              role: user.role
            },
            token,
            expiresAt,
            debug: {
              userFound: true,
              bcryptResult: isValidPassword,
              message: 'Login successful'
            }
          });

        } else {
          console.log('Auth Debug - No user found with username:', username);
          return res.status(401).json({ 
            error: 'Invalid username or password',
            debug: {
              userFound: false,
              queriedUsername: username
            }
          });
        }

      } catch (error) {
        console.error('Auth Debug - Login error:', error);
        console.error('Auth Debug - Error stack:', error.stack);
        return res.status(500).json({ 
          error: 'Login failed',
          debug: {
            errorMessage: error.message,
            errorName: error.name
          }
        });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}; 