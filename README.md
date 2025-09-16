# Amazon Cognito Adaptive Authentication Demo

A simple demonstration of Amazon Cognito's Adaptive Authentication capabilities with device fingerprinting and risk-based MFA.

## 🎯 What This Demo Shows

- **Device Fingerprinting**: Automatic collection of device and browser characteristics
- **Risk Assessment**: Cognito evaluates login risk based on device, location, and behavioral patterns
- **Adaptive MFA**: Automatic MFA triggers for suspicious login attempts
- **Real-time Security**: Machine learning-powered threat detection

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│   Browser   │───▶│   Node.js   │───▶│ Amazon Cognito  │
│             │    │   Express   │    │  User Pool      │
│ Device Data │    │             │    │ + Adaptive Auth │
└─────────────┘    └─────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- AWS Account with Cognito access
- Node.js 16+ installed
- A Cognito User Pool with Advanced Security enabled

### 1. Clone and Install

```bash
git clone <repository-url>
cd cognito-adaptive-auth
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your Cognito configuration:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=your-cognito-domain
REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

### 3. Configure Cognito User Pool

#### Enable Advanced Security

1. **AWS Console** → **Cognito** → **User Pools**
2. Select your User Pool
3. **App integration** → **Advanced security**
4. Set to **Enforced** mode

#### Configure App Client

1. **App integration** → **App clients** → Select your app client → **Edit**
2. Under **Advanced authentication settings**:
   - ✅ Check **"Accept additional user context data"**
   - This enables `EnablePropagateAdditionalUserContextData=true`

#### Configure Risk Responses

Set adaptive authentication rules:

- **Low Risk**: Allow
- **Medium Risk**: Optional MFA  
- **High Risk**: Require MFA

#### Create Test User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser@example.com \
  --user-attributes Name=email,Value=testuser@example.com Name=phone_number,Value=+1234567890 \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

### 4. Run the Demo

```bash
npm start
# or for development
npm run dev
```

Visit: `http://localhost:3000`

## 🧪 Testing Adaptive Authentication

### Test Scenarios

1. **Normal Login**: Same device, same location → Low risk
2. **New Browser**: Different browser → Medium risk → Optional MFA
3. **VPN/Proxy**: Different IP/location → High risk → Required MFA
4. **Suspicious Pattern**: Multiple failed attempts → Blocked

### Device Data Collected

The demo automatically collects:

- **User Agent**: Browser and OS information
- **IP Address**: Network location
- **Accept-Language**: Browser language settings
- **Device Fingerprint**: SHA-256 hash of device characteristics

## 📊 Monitoring

### CloudWatch Metrics

Cognito publishes metrics to CloudWatch:

- `SignInSuccesses`
- `SignInThrottles` 
- `RiskDecisions`
- `CompromisedCredentialsRisk`

### User Event History

View authentication events in:
- **Cognito Console** → **Users** → Select user → **User details**
- **API**: `AdminListUserAuthEvents`

## 🔄 Hosted UI Integration

The app automatically redirects to Cognito's hosted UI for:
- **Password changes** (NEW_PASSWORD_REQUIRED)
- **MFA setup** (UserNotConfirmedException)
- **Complex authentication flows**

Configure your Cognito domain and callback URL in `.env`.

## 🔧 Configuration Options

### Risk Response Actions

```javascript
// In Cognito Console: App integration → Advanced security
{
  "LowAction": "Allow",           // No additional verification
  "MediumAction": "MfaIfConfigured", // MFA if user has it set up
  "HighAction": "MfaRequired"     // Force MFA setup if needed
}
```

### Device Fingerprinting Implementation

This demo uses the official Amazon Cognito Advanced Security Data library:

**Client-side (JavaScript):**
```javascript
// Collect device fingerprint using Cognito's library
const encodedData = AmazonCognitoAdvancedSecurityData.getData(
  username, 
  userPoolId,
  clientId
);
```

**Server-side (Node.js):**
```javascript
function collectDeviceData(req) {
  return {
    IpAddress: await getClientIP(req),
    EncodedData: req.body.encodedData || fallbackFingerprint(req)
  };
}

// Include in Cognito authentication
const params = {
  AuthFlow: 'USER_PASSWORD_AUTH',
  ClientId: process.env.COGNITO_CLIENT_ID,
  UserContextData: deviceData, // <- Key for adaptive auth
  AuthParameters: { /* ... */ }
};
```

## 🛡️ Security Features

### Automatic Risk Assessment

Cognito evaluates:
- **Device Recognition**: Known vs unknown devices
- **Geolocation**: Distance from previous logins  
- **IP Reputation**: Known malicious IPs
- **Behavioral Patterns**: Login frequency and timing

### Machine Learning

- **Continuous Learning**: Risk models improve over time
- **Feedback Loop**: Event feedback enhances accuracy
- **Anomaly Detection**: Identifies unusual patterns

## 📚 API Reference

### Login with Device Data

```javascript
POST /api/login
{
  "username": "user@example.com",
  "password": "password123"
}

// Response - Low Risk
{
  "success": true,
  "message": "Login successful",
  "tokens": { ... }
}

// Response - High Risk  
{
  "success": true,
  "challengeName": "SMS_MFA",
  "session": "session-token",
  "message": "MFA required - SMS code sent"
}
```

### MFA Verification

```javascript
POST /api/verify-mfa
{
  "username": "user@example.com", 
  "session": "session-token",
  "mfaCode": "123456"
}
```

## 🎨 Customization

### Custom Risk Logic

Implement additional risk factors:

```javascript
function calculateCustomRisk(deviceData, userHistory) {
  let riskScore = 0;
  
  // Time-based risk
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) riskScore += 10;
  
  // Frequency-based risk  
  const recentLogins = userHistory.filter(/* last 24h */);
  if (recentLogins.length > 10) riskScore += 20;
  
  return riskScore;
}
```

### Custom Notifications

Configure email templates in Cognito Console:
- **App integration** → **Message templates**
- Customize risk notification messages

## 🔍 Troubleshooting

### Common Issues

**"Invalid UserContextData"**
- Ensure `EncodedData` is valid base64
- Check `IpAddress` format (IPv4/IPv6)

**"MFA Not Triggered"**  
- Verify Advanced Security is **Enforced**
- Check risk response configuration
- Ensure user has verified phone number

**"Authentication Failed"**
- Verify Cognito configuration
- Check user exists and is confirmed
- Validate client secret calculation

### Debug Mode

Enable detailed logging:

```javascript
// Add to app.js
app.use((req, res, next) => {
  console.log('Request:', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  next();
});
```

## 📖 Learn More

- [Cognito Adaptive Authentication Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-adaptive-authentication.html)
- [Advanced Security Features](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-advanced-security.html)
- [Device Fingerprinting Best Practices](https://aws.amazon.com/blogs/security/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**AWS Samples** | Built with ❤️ for the AWS Community