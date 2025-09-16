const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
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

// Validate IP format and check if public
function validateIP(ip) {
  console.log('🔍 Validating IP:', ip, 'Type:', typeof ip);
  
  if (!ip || typeof ip !== 'string') {
    console.log('❌ Invalid IP: null, undefined, or not string');
    return { valid: false, isPublic: false, reason: 'Invalid format' };
  }
  
  // IPv4 regex validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipv4Regex.test(ip)) {
    console.log('❌ Invalid IPv4 format:', ip);
    return { valid: false, isPublic: false, reason: 'Invalid IPv4 format' };
  }
  
  // Private IP ranges that Cognito rejects
  const privateRanges = [
    /^127\./,           // 127.0.0.0/8 (localhost)
    /^10\./,            // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./,      // 192.168.0.0/16
    /^169\.254\./,      // 169.254.0.0/16 (link-local)
    /^0\./,             // 0.0.0.0/8
    /^224\./,           // 224.0.0.0/4 (multicast)
    /^240\./            // 240.0.0.0/4 (reserved)
  ];
  
  const isPrivate = privateRanges.some(range => range.test(ip));
  console.log('🔍 IP validation result:', { ip, valid: true, isPublic: !isPrivate });
  
  return { valid: true, isPublic: !isPrivate, reason: isPrivate ? 'Private IP' : 'Valid public IP' };
}

// Get public IP address
async function getPublicIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
    return response.data.ip;
  } catch (error) {
    console.warn('Failed to get public IP:', error.message);
    return null;
  }
}

// Get client IP address with public IP fallback
async function getClientIP(req) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  console.log('🔍 Raw IP from request:', ip);

  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
    console.log('🔍 IP after comma split:', ip);
  }

  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
    console.log('🔍 IPv6 localhost converted to:', ip);
  }

  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
    console.log('🔍 IPv6 prefix removed:', ip);
  }

  // If localhost, try to get real public IP
  if (ip === '127.0.0.1') {
    console.log('🌐 Localhost detected, fetching public IP...');
    const publicIP = await getPublicIP();
    if (publicIP) {
      console.log('✅ Public IP fetched:', publicIP);
      return publicIP;
    } else {
      console.log('❌ Failed to fetch public IP, using localhost');
    }
  }

  console.log('🔍 Final IP address:', ip);
  return ip;
}

// Collect device fingerprint data according to Cognito specs
async function collectDeviceData(req) {
  const ip = await getClientIP(req);
  const ipValidation = validateIP(ip);
  
  // Use EncodedData from client if available (from AmazonCognitoAdvancedSecurityData.getData())
  let encodedData = req.body.encodedData;
  
  // If no client-side data, create basic server-side fingerprint
  if (!encodedData) {
    encodedData = Buffer.from(JSON.stringify({
      contextData: {
        ServerName: req.get('host') || 'localhost',
        ServerPath: req.path || '/api/login',
        HttpHeaders: [
          {
            headerName: 'User-Agent',
            headerValue: req.headers['user-agent'] || ''
          },
          {
            headerName: 'Accept-Language', 
            headerValue: req.headers['accept-language'] || ''
          }
        ]
      }
    })).toString('base64');
  }
  
  const contextData = {
    EncodedData: encodedData
  };
  
  // Only include IP if it's a valid public IP
  if (ipValidation.valid && ipValidation.isPublic) {
    contextData.IpAddress = ip;
  }
  
  console.log('📋 UserContextData structure:', JSON.stringify(contextData, null, 2));
  console.log('🔍 IP validation:', ipValidation);
  return contextData;
}

// Login endpoint with adaptive authentication
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const deviceData = await collectDeviceData(req);
    console.log('📱 Device Data:', JSON.stringify(deviceData, null, 2));
    console.log('🔒 IP Address:', deviceData.IpAddress);

    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(username)
      }
    };

    // Always add UserContextData (EncodedData is always included, IP only if valid)
    console.log('✅ Adding UserContextData to Cognito request');
    params.UserContextData = deviceData;
    
    console.log('🚀 Cognito params:', JSON.stringify(params, null, 2));




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
    } else if (error.name === 'NewPasswordRequiredException') {
      res.status(400).json({
        error: 'Password change required',
        challengeName: 'NEW_PASSWORD_REQUIRED',
        redirectToHostedUI: true,
        hostedUIUrl: `https://${process.env.COGNITO_DOMAIN}.auth.${process.env.AWS_REGION}.amazoncognito.com/login?client_id=${process.env.COGNITO_CLIENT_ID}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI || 'http://localhost:3000/callback')}`
      });
    } else if (error.name === 'UserNotConfirmedException') {
      res.status(400).json({
        error: 'MFA setup required',
        challengeName: 'MFA_SETUP',
        redirectToHostedUI: true,
        hostedUIUrl: `https://${process.env.COGNITO_DOMAIN}.auth.${process.env.AWS_REGION}.amazoncognito.com/login?client_id=${process.env.COGNITO_CLIENT_ID}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI || 'http://localhost:3000/callback')}`
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

// Cognito configuration endpoint for client-side device fingerprinting
app.get('/api/config', (req, res) => {
  res.json({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    region: process.env.AWS_REGION,
    domain: process.env.COGNITO_DOMAIN
  });
});

// Handle Cognito redirects
app.get('/callback', (req, res) => {
  res.redirect('/');
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