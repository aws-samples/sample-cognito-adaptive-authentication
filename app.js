const express = require('express');
const crypto = require('crypto');
const { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

// Calculate secret hash for Cognito
function calculateSecretHash(username) {
  return crypto
    .createHmac('SHA256', process.env.COGNITO_CLIENT_SECRET)
    .update(username + process.env.COGNITO_CLIENT_ID)
    .digest('base64');
}

// Check if IP is public (Cognito only accepts public IPs)
function isPublicIP(ip) {
  if (!ip) return false;
  
  // Private IP ranges that Cognito rejects
  const privateRanges = [
    /^127\./,           // 127.0.0.0/8 (localhost)
    /^10\./,            // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./       // 192.168.0.0/16
  ];
  
  return !privateRanges.some(range => range.test(ip));
}

// Get client IP address
function getClientIP(req) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }
  
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  return ip;
}

// Collect device fingerprint data
function collectDeviceData(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const ip = getClientIP(req);
  
  // Create device fingerprint
  const deviceFingerprint = crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage + ip)
    .digest('hex');

  return {
    IpAddress: ip,
    EncodedData: Buffer.from(JSON.stringify({
      userAgent,
      acceptLanguage,
      deviceFingerprint,
      timestamp: new Date().toISOString()
    })).toString('base64')
  };
}

// Login endpoint with adaptive authentication
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const deviceData = collectDeviceData(req);
    
    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(username)
      }
    };
    
    // Only add UserContextData if IP is public
    if (isPublicIP(deviceData.IpAddress)) {
      params.UserContextData = deviceData;
    }

    const command = new InitiateAuthCommand(params);
    const result = await cognitoClient.send(command);

    if (result.ChallengeName === 'SMS_MFA') {
      res.json({
        success: true,
        challengeName: result.ChallengeName,
        session: result.Session,
        message: 'MFA required - SMS code sent to your phone'
      });
    } else if (result.AuthenticationResult) {
      res.json({
        success: true,
        message: 'Login successful',
        tokens: {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken
        }
      });
    } else {
      res.status(400).json({ error: 'Unexpected authentication result' });
    }
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.name === 'PasswordResetRequiredException') {
      res.status(400).json({ 
        error: 'Password reset required', 
        message: 'Your password needs to be reset. Please check your email or contact support.',
        requiresPasswordReset: true
      });
    } else {
      res.status(401).json({ 
        error: 'Authentication failed', 
        details: error.message 
      });
    }
  }
});

// MFA verification endpoint
app.post('/api/verify-mfa', async (req, res) => {
  try {
    const { username, session, mfaCode } = req.body;
    
    if (!username || !session || !mfaCode) {
      return res.status(400).json({ error: 'Username, session, and MFA code required' });
    }

    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      ChallengeName: 'SMS_MFA',
      Session: session,
      ChallengeResponses: {
        USERNAME: username,
        SMS_MFA_CODE: mfaCode,
        SECRET_HASH: calculateSecretHash(username)
      }
    };

    const command = new RespondToAuthChallengeCommand(params);
    const result = await cognitoClient.send(command);

    if (result.AuthenticationResult) {
      res.json({
        success: true,
        message: 'MFA verification successful',
        tokens: {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken
        }
      });
    } else {
      res.status(400).json({ error: 'MFA verification failed' });
    }
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(401).json({ 
      error: 'MFA verification failed', 
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    adaptiveAuth: 'enabled'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Cognito Adaptive Auth Demo running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to test adaptive authentication`);
});