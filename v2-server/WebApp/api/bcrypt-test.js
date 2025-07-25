const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  try {
    const testPassword = 'test123';
    
    console.log('Bcrypt Test - Starting hash generation');
    console.log('Bcrypt Test - Password:', testPassword);
    
    // Generate a fresh hash
    const freshHash = await bcrypt.hash(testPassword, 10);
    console.log('Bcrypt Test - Fresh hash generated:', freshHash);
    
    // Test the fresh hash immediately
    const freshResult = await bcrypt.compare(testPassword, freshHash);
    console.log('Bcrypt Test - Fresh hash comparison:', freshResult);
    
    // Test with known hashes
    const knownHashes = [
      '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // Should be 'test'
      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Should be 'admin123'
    ];
    
    const knownPasswords = ['test', 'admin123'];
    
    const testResults = [];
    
    for (let i = 0; i < knownHashes.length; i++) {
      for (let j = 0; j < knownPasswords.length; j++) {
        const result = await bcrypt.compare(knownPasswords[j], knownHashes[i]);
        testResults.push({
          password: knownPasswords[j],
          hash: knownHashes[i],
          result: result,
          expected: (i === j)
        });
        console.log(`Bcrypt Test - ${knownPasswords[j]} vs hash[${i}]: ${result}`);
      }
    }
    
    // Test simple passwords
    const simpleTests = ['test', 'admin', '123', 'password'];
    const simpleResults = [];
    
    for (const pwd of simpleTests) {
      const hash = await bcrypt.hash(pwd, 10);
      const verification = await bcrypt.compare(pwd, hash);
      simpleResults.push({
        password: pwd,
        hash: hash,
        verification: verification
      });
      console.log(`Bcrypt Test - Simple test '${pwd}': ${verification}`);
    }
    
    res.status(200).json({
      success: true,
      bcryptVersion: require('bcryptjs/package.json').version,
      freshTest: {
        password: testPassword,
        hash: freshHash,
        verification: freshResult
      },
      knownHashTests: testResults,
      simpleTests: simpleResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    });
    
  } catch (error) {
    console.error('Bcrypt Test - Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}; 