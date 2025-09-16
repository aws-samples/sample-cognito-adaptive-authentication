# Building Intelligent Authentication with Amazon Cognito Adaptive Authentication

Modern applications face increasingly sophisticated security threats. Traditional username/password authentication is no longer sufficient to protect user accounts from compromise. Amazon Cognito's Adaptive Authentication provides an intelligent, machine learning-powered solution that automatically adjusts security requirements based on real-time risk assessment.

## What is Adaptive Authentication?

Adaptive Authentication is a security feature that dynamically evaluates the risk of each login attempt and responds accordingly. Instead of applying the same security measures to all users, it intelligently adapts based on factors like:

- **Device Recognition**: Is this a known or new device?
- **Geolocation**: Is the user logging in from their usual location?
- **Behavioral Patterns**: Does this match the user's typical login behavior?
- **IP Reputation**: Is the IP address associated with malicious activity?

## How It Works

When a user attempts to sign in, Cognito:

1. **Collects Device Data**: Gathers device fingerprint, IP address, and browser information
2. **Assesses Risk**: Uses machine learning to evaluate the likelihood of compromise
3. **Assigns Risk Level**: Categorizes the attempt as Low, Medium, High, or No Risk
4. **Takes Action**: Responds based on your configured rules (Allow, Optional MFA, Require MFA, or Block)

## Building the Demo

Let's build a simple application that demonstrates Adaptive Authentication in action.

### Setting Up the Backend

Our Node.js application collects device data and sends it to Cognito for risk assessment:

```javascript
// Collect device fingerprint data
function collectDeviceData(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
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
```

### Sending Device Data to Cognito

When initiating authentication, we include the device data in the `UserContextData` parameter:

```javascript
const params = {
  AuthFlow: 'USER_PASSWORD_AUTH',
  ClientId: process.env.COGNITO_CLIENT_ID,
  AuthParameters: {
    USERNAME: username,
    PASSWORD: password,
    SECRET_HASH: calculateSecretHash(username)
  },
  // This is key - sending device data for risk assessment
  UserContextData: collectDeviceData(req)
};

const result = await cognitoClient.send(new InitiateAuthCommand(params));
```

### Handling Adaptive Responses

Cognito may respond with different challenges based on risk level:

```javascript
if (result.ChallengeName === 'SMS_MFA') {
  // High risk detected - MFA required
  res.json({
    success: true,
    challengeName: result.ChallengeName,
    session: result.Session,
    message: 'MFA required - SMS code sent to your phone'
  });
} else if (result.AuthenticationResult) {
  // Low risk - authentication successful
  res.json({
    success: true,
    message: 'Login successful',
    tokens: result.AuthenticationResult
  });
}
```

### Hosted UI Integration

For complex flows like password changes or MFA setup, redirect to Cognito's hosted UI:

```javascript
// Handle challenges requiring hosted UI
if (error.name === 'NewPasswordRequiredException') {
  res.json({
    redirectToHostedUI: true,
    hostedUIUrl: `https://${cognitoDomain}.auth.${region}.amazoncognito.com/login?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=${redirectUri}`
  });
}
```

## Configuring Cognito for Adaptive Authentication

### Enable App Client Settings

First, configure your app client to accept device data:

1. **Cognito Console** → **User Pools** → **App integration** → **App clients**
2. Select your app client → **Edit**
3. Under **Advanced authentication settings**:
   - ✅ Check **"Accept additional user context data"**
   - This enables `EnablePropagateAdditionalUserContextData=true`

### Configure Risk Responses

In the Cognito console, you can configure how to respond to different risk levels:

### Risk Level Actions

- **Low Risk**: Allow - Users sign in normally
- **Medium Risk**: Optional MFA - MFA only if configured
- **High Risk**: Require MFA - Force MFA setup if needed
- **Any Risk**: Block - Prevent sign-in entirely

### Advanced Configuration

```javascript
// Example risk configuration
{
  "CompromisedCredentialsRiskConfiguration": {
    "Actions": {
      "EventAction": "BLOCK"  // Block compromised credentials
    }
  },
  "AccountTakeoverRiskConfiguration": {
    "Actions": {
      "HighAction": { "EventAction": "MFA_REQUIRED" },
      "MediumAction": { "EventAction": "MFA_IF_CONFIGURED" },
      "LowAction": { "EventAction": "NO_ACTION" }
    }
  }
}
```

## Testing Different Risk Scenarios

### Low Risk Scenario
- Same device and browser
- Familiar IP address/location
- Normal time of day
- **Result**: Seamless login

### Medium Risk Scenario  
- New browser or device
- Slightly different location
- **Result**: Optional MFA (if configured)

### High Risk Scenario
- Completely new device
- Different country/region
- Suspicious IP address
- **Result**: Required MFA

### Blocked Scenario
- Known compromised credentials
- Malicious IP address
- **Result**: Login blocked entirely

## Benefits of Adaptive Authentication

### Enhanced Security
- **Automatic Threat Detection**: No manual rule configuration needed
- **Machine Learning**: Continuously improves accuracy
- **Real-time Response**: Immediate protection against threats

### Improved User Experience
- **Seamless for Trusted Users**: No friction for low-risk logins
- **Contextual Security**: Only adds friction when necessary
- **Transparent Operation**: Users aren't aware of the risk assessment

### Operational Efficiency
- **Reduced Support Tickets**: Fewer false positives than static rules
- **Automated Responses**: No manual intervention required
- **Detailed Logging**: Complete audit trail of security decisions

## Monitoring and Analytics

Cognito provides comprehensive metrics through CloudWatch:

```javascript
// Key metrics to monitor
- SignInSuccesses: Successful authentication attempts
- SignInThrottles: Blocked attempts due to rate limiting  
- RiskDecisions: Risk-based authentication decisions
- CompromisedCredentialsRisk: Detected credential compromise
```

### User Event History

Track individual user authentication events:

```javascript
// View user event history
const events = await cognitoClient.send(new AdminListUserAuthEventsCommand({
  UserPoolId: 'us-east-1_XXXXXXXXX',
  Username: 'user@example.com',
  MaxResults: 10
}));
```

## Best Practices

### Device Data Collection
- **Collect Rich Context**: Include as much device information as possible
- **Client-Side Fingerprinting**: Use browser APIs for detailed device data
- **Privacy Compliance**: Ensure data collection follows privacy regulations

### Risk Configuration
- **Start Conservative**: Begin with "Audit-only" mode to understand patterns
- **Gradual Rollout**: Slowly increase security measures based on data
- **User Communication**: Inform users about enhanced security measures

### Monitoring and Tuning
- **Regular Review**: Analyze authentication patterns and adjust rules
- **Feedback Loop**: Use event feedback to improve accuracy
- **Performance Monitoring**: Ensure security doesn't impact user experience

## Conclusion

Amazon Cognito's Adaptive Authentication represents a significant advancement in application security. By leveraging machine learning and real-time risk assessment, it provides intelligent protection that adapts to threats while maintaining a smooth user experience.

The demo application shows how easy it is to implement this powerful security feature with just a few lines of code. By collecting device data and letting Cognito handle the risk assessment, you can significantly enhance your application's security posture without complex custom implementations.

As cyber threats continue to evolve, adaptive authentication provides the intelligent, automated defense mechanisms modern applications need to stay secure.

---

**Try the Demo**: [GitHub Repository](https://github.com/aws-samples/cognito-adaptive-auth-demo)

**Learn More**: [Amazon Cognito Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-adaptive-authentication.html)