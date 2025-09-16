# Amazon Cognito Adaptive Authentication Test Scenarios

This document outlines comprehensive test scenarios to validate Cognito's adaptive authentication capabilities using device fingerprinting, IP reputation, and behavioral analysis.

## 🎯 Test Environment Setup

### Prerequisites
- Cognito User Pool with Advanced Security **Enforced**
- App Client with **"Accept additional user context data"** enabled
- Test user account with verified email/phone
- Multiple browsers/devices for testing

### Risk Configuration
Configure these risk response actions in Cognito Console:

```
Low Risk: Allow
Medium Risk: MFA if Configured  
High Risk: MFA Required
```

## 📱 Device-Based Test Scenarios

### Scenario 1: Trusted Device (Low Risk)
**Setup:**
- Same browser and device used previously
- Normal login time and location
- IPv4 public address

**Expected Result:** ✅ Direct login success
**Test Steps:**
1. Login with username/password
2. Verify immediate authentication
3. Check Cognito logs for "Low" risk assessment

### Scenario 2: New Browser (Medium Risk)
**Setup:**
- Different browser on same device
- Same IP address and location
- Clear browser data/cookies

**Expected Result:** ⚠️ Optional MFA (if configured)
**Test Steps:**
1. Open incognito/private browser window
2. Login with same credentials
3. Verify MFA prompt appears (if user has MFA configured)

### Scenario 3: Completely New Device (High Risk)
**Setup:**
- Different device (mobile, tablet, another computer)
- Different browser fingerprint
- Same or different location

**Expected Result:** 🔒 MFA Required
**Test Steps:**
1. Login from new device
2. Verify MFA is enforced
3. Complete SMS/TOTP verification

## 🌐 IP-Based Test Scenarios

### Scenario 4: IPv4 vs IPv6 Testing
**Setup IPv4 (Allowed):**
- Configure threat protection to allow your public IPv4
- Use normal browser connection

**Setup IPv6 (Blocked):**
- Configure threat protection to block your IPv6 range
- Use incognito mode or IPv6-enabled connection

**Test Steps:**
1. **IPv4 Test:**
   ```bash
   # Check your IPv4
   curl -4 ifconfig.me
   ```
   - Login normally
   - Expected: ✅ Low/Medium risk

2. **IPv6 Test:**
   ```bash
   # Check your IPv6  
   curl -6 ifconfig.me
   ```
   - Login from incognito mode
   - Expected: 🚫 Blocked or High risk

### Scenario 5: VPN/Proxy Testing (High Risk)
**Setup:**
- Connect through VPN service
- Use different geographic location
- Different IP reputation

**Expected Result:** 🔒 MFA Required or Blocked
**Test Steps:**
1. Connect to VPN (different country)
2. Attempt login
3. Verify enhanced security measures

### Scenario 6: Tor Browser (Blocked)
**Setup:**
- Use Tor browser for anonymized connection
- Multiple IP hops and anonymization

**Expected Result:** 🚫 Login blocked
**Test Steps:**
1. Download and use Tor browser
2. Attempt login
3. Verify connection is blocked

## ⏰ Behavioral Test Scenarios

### Scenario 7: Unusual Time Login (Medium Risk)
**Setup:**
- Login at unusual hours (3 AM if you normally login during day)
- Same device and location

**Expected Result:** ⚠️ Medium risk assessment
**Test Steps:**
1. Login during off-hours
2. Monitor risk assessment
3. Verify appropriate response

### Scenario 8: Rapid Multiple Attempts (High Risk)
**Setup:**
- Multiple failed login attempts
- Followed by successful attempt

**Expected Result:** 🔒 Account temporarily locked or MFA required
**Test Steps:**
1. Make 3-5 failed login attempts
2. Wait 1 minute
3. Login with correct credentials
4. Verify enhanced security response

### Scenario 9: Geographic Anomaly (High Risk)
**Setup:**
- Use VPN to simulate login from different continent
- Within short time frame of previous login

**Expected Result:** 🔒 MFA Required
**Test Steps:**
1. Login normally from home location
2. Immediately connect to VPN (different continent)
3. Login again within 5 minutes
4. Verify impossible travel detection

## 🛡️ Threat Protection Configuration

### IP Allow/Block Lists

**Allow Your IPv4:**
```json
{
  "IpAddress": "YOUR_PUBLIC_IPV4/32",
  "Action": "ALLOW"
}
```

**Block IPv6 Range:**
```json
{
  "IpAddress": "YOUR_IPV6_RANGE/64", 
  "Action": "BLOCK"
}
```

### Configure in Cognito Console:
1. **User Pools** → **Advanced Security** → **Threat Protection**
2. **Add IP Address** → Enter your IPv4 with `/32` suffix
3. **Action**: Allow
4. **Add IP Address** → Enter your IPv6 range with `/64` suffix  
5. **Action**: Block

## 📊 Monitoring and Validation

### CloudWatch Metrics to Monitor
```bash
# Key metrics during testing
- SignInSuccesses: Successful authentications
- SignInThrottles: Blocked attempts
- RiskDecisions: Risk assessment outcomes
- CompromisedCredentialsRisk: Credential compromise detection
```

### User Event History
Check individual authentication events:
1. **Cognito Console** → **Users** → Select test user
2. **User details** → View authentication history
3. Verify risk assessments and actions taken

### Test Validation Checklist

**For Each Scenario:**
- [ ] Risk level matches expected (Low/Medium/High)
- [ ] Appropriate action taken (Allow/MFA/Block)
- [ ] User experience is smooth for trusted scenarios
- [ ] Security measures activate for suspicious scenarios
- [ ] CloudWatch metrics reflect the activity
- [ ] User event history shows correct risk assessment

## 🔧 Advanced Test Scenarios

### Scenario 10: Compromised Credentials Simulation
**Setup:**
- Use credentials that appear in known breach databases
- Test Cognito's compromised credential detection

**Expected Result:** 🚫 Login blocked with compromised credential alert

### Scenario 11: Device Fingerprint Spoofing
**Setup:**
- Use browser extensions to modify user agent
- Change screen resolution and timezone
- Attempt to bypass device recognition

**Expected Result:** 🔒 Treated as new device, MFA required

### Scenario 12: Session Hijacking Simulation  
**Setup:**
- Login normally to establish session
- Change IP address mid-session
- Continue using application

**Expected Result:** ⚠️ Session invalidation or re-authentication required

## 📝 Test Results Template

```markdown
## Test Execution Results

### Scenario: [Name]
- **Date/Time:** 
- **Risk Level:** Low/Medium/High/Blocked
- **Action Taken:** Allow/MFA/Block
- **User Experience:** Smooth/Friction/Blocked
- **CloudWatch Metrics:** [Screenshot/Values]
- **Notes:** 

### Observations:
- Device fingerprinting accuracy: 
- IP reputation effectiveness:
- Behavioral analysis results:
- False positive rate:
- User experience impact:
```

## 🎯 Success Criteria

**Adaptive Authentication is working correctly when:**
- ✅ Trusted users experience seamless login
- ✅ Suspicious activity triggers appropriate security measures  
- ✅ Risk assessments are accurate and contextual
- ✅ User experience balances security with usability
- ✅ Threat protection rules are enforced correctly
- ✅ Machine learning improves accuracy over time

## 🚀 Next Steps

After completing these test scenarios:
1. **Analyze Results:** Review risk assessment accuracy
2. **Tune Configuration:** Adjust risk response actions based on findings
3. **User Training:** Educate users about enhanced security measures
4. **Monitor Production:** Implement ongoing monitoring and alerting
5. **Iterate:** Continuously improve based on real-world usage patterns

---

**Remember:** Start with audit mode to understand patterns before enforcing security measures in production environments.