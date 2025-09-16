#!/usr/bin/env node

/**
 * Test script to verify Amazon Cognito Advanced Security Data integration
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Cognito Advanced Security Data Integration\n');

// Check if the library file exists
const libPath = path.join(__dirname, 'amazon-cognito-advanced-security-data.min.js');
if (fs.existsSync(libPath)) {
  console.log('✅ Amazon Cognito Advanced Security Data library found');
  
  const stats = fs.statSync(libPath);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime.toISOString()}`);
} else {
  console.log('❌ Amazon Cognito Advanced Security Data library NOT found');
  process.exit(1);
}

// Check HTML integration
const htmlPath = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  if (htmlContent.includes('amazon-cognito-advanced-security-data.min.js')) {
    console.log('✅ Library properly included in HTML');
  } else {
    console.log('❌ Library NOT included in HTML');
  }
  
  if (htmlContent.includes('AmazonCognitoAdvancedSecurityData.getData')) {
    console.log('✅ getData() method properly used');
  } else {
    console.log('❌ getData() method NOT found');
  }
  
  if (htmlContent.includes('encodedData')) {
    console.log('✅ EncodedData parameter properly sent to server');
  } else {
    console.log('❌ EncodedData parameter NOT found');
  }
}

// Check server integration
const serverPath = path.join(__dirname, 'app.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  if (serverContent.includes('req.body.encodedData')) {
    console.log('✅ Server properly handles encodedData from client');
  } else {
    console.log('❌ Server does NOT handle encodedData');
  }
  
  if (serverContent.includes('UserContextData')) {
    console.log('✅ UserContextData properly configured for Cognito');
  } else {
    console.log('❌ UserContextData NOT configured');
  }
  
  if (serverContent.includes('/api/config')) {
    console.log('✅ Configuration endpoint available for client');
  } else {
    console.log('❌ Configuration endpoint NOT found');
  }
}

console.log('\n🎯 Integration Summary:');
console.log('   - Device fingerprinting: Amazon Cognito Advanced Security Data library');
console.log('   - Client-side: getData() collects device characteristics');
console.log('   - Server-side: UserContextData includes IP + EncodedData');
console.log('   - Adaptive Auth: Cognito evaluates risk and triggers MFA as needed');

console.log('\n📚 Next Steps:');
console.log('   1. Configure your .env file with Cognito credentials');
console.log('   2. Enable Advanced Security (Enforced) in your Cognito User Pool');
console.log('   3. App Client → Advanced authentication settings → Check "Accept additional user context data"');
console.log('   4. Run: npm start');
console.log('   5. Test with different browsers/networks to trigger adaptive responses');

console.log('\n✨ Integration test completed!');