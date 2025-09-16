# Amazon Cognito Adaptive Authentication Demo - Threat Model

## Introduction

### Purpose

This threat model analyzes the security posture of the Amazon Cognito Adaptive Authentication Demo application. The demo showcases Cognito's machine learning-powered adaptive authentication capabilities, including device fingerprinting, risk-based MFA, and behavioral analysis. This educational asset demonstrates how to implement intelligent authentication that automatically adjusts security requirements based on real-time risk assessment.

### Project/Asset Overview

The project is a Node.js Express web application that integrates with Amazon Cognito User Pools to demonstrate adaptive authentication. Major components include:

- **Frontend**: HTML/JavaScript single-page application with device fingerprinting
- **Backend**: Node.js Express server handling authentication flows
- **AWS Services**: Amazon Cognito User Pools with Advanced Security features
- **3rd Party Libraries**: Amazon Cognito Advanced Security Data library for device fingerprinting
- **Deployment**: Local development environment (localhost:3000)

The application collects device characteristics, sends them to Cognito for risk assessment, and responds with appropriate authentication challenges based on the calculated risk level.

### Assumptions

| ID | Assumption | Comments |
|----|------------|----------|
| A-01 | The sample asset will be deployed into a non-production environment for educational purposes only. | Demo is not intended for production use |
| A-02 | Users will configure Cognito User Pool with Advanced Security in "Enforced" mode | Required for adaptive authentication features |
| A-03 | TLS 1.2+ is used for all communications between browser and server | Standard HTTPS encryption |
| A-04 | AWS credentials are properly secured and not exposed in code | Environment variables used for sensitive data |
| A-05 | Users understand this is a demonstration and will implement additional security controls for production | Educational purpose with basic security controls |

### References

- **Code Repo**: https://github.com/paramanandmallik/cognito-aa-deviceinfo
- **Project Team**: Paramanand Mallik
- **CSR Link**: N/A (Educational Demo)
- **SFDC Opportunity Link**: N/A
- **Other documentation**: README.md, TEST_SCENARIOS.md

## Solution Architecture

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│   Web Browser   │───▶│   Node.js App   │───▶│  Amazon Cognito     │
│                 │    │   (Express)     │    │   User Pool         │
│ - Device Data   │    │ - Auth Handler  │    │ - Advanced Security │
│ - Fingerprint   │    │ - IP Detection  │    │ - Risk Assessment   │
│ - User Input    │    │ - Session Mgmt  │    │ - MFA Enforcement   │
└─────────────────┘    └─────────────────┘    └─────────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│ Cognito Hosted  │    │  CloudWatch     │    │   Threat Protection │
│      UI         │    │   Metrics       │    │    IP Allow/Block   │
│ - Password Reset│    │ - Auth Events   │    │  - Compromised Creds│
│ - MFA Setup     │    │ - Risk Decisions│    │  - Behavioral Rules │
└─────────────────┘    └─────────────────┘    └─────────────────────┘
```

### Main Functionality/Use Cases of the Solution

1. **User Authentication**: Standard username/password login with adaptive security
2. **Device Fingerprinting**: Automatic collection of browser and device characteristics
3. **Risk Assessment**: Real-time evaluation of login attempts using ML models
4. **Adaptive MFA**: Dynamic MFA requirements based on risk level
5. **Password Management**: Integration with Cognito hosted UI for password changes
6. **Session Management**: Secure token handling and session lifecycle
7. **Monitoring**: CloudWatch integration for security event tracking

### Assets/Dependencies

| Asset Name | Asset Usage | Data Type | Comments |
|------------|-------------|-----------|----------|
| User Credentials | Authentication data stored in Cognito | Customer Data | Username, password hashes, MFA settings |
| Device Fingerprints | Browser/device characteristics for risk assessment | Service Data | Collected via Cognito Advanced Security library |
| Session Tokens | JWT tokens for authenticated sessions | Service Data | Access, ID, and refresh tokens |
| IP Addresses | Network location data for geolocation analysis | Service Data | IPv4/IPv6 addresses, geolocation metadata |
| Authentication Logs | Security events and risk decisions | Service Data | CloudWatch logs, user event history |
| Application Secrets | Cognito client secrets and configuration | Service Data | Environment variables, not in code |
| TLS Certificates | HTTPS encryption for data in transit | Service Data | Browser-managed certificates |

## Threats & Mitigations

### Threat Actors

| Threat Actor # | Threat Actor Description |
|----------------|--------------------------|
| TA1 | Malicious actor from the internet attempting unauthorized access |
| TA2 | Compromised user credentials from data breaches |
| TA3 | Insider threat with legitimate user access |
| TA4 | Attacker with local network access (man-in-the-middle) |
| TA5 | Malicious actor attempting to bypass adaptive authentication |
| TA6 | Developer/administrator with elevated system access |

### Threat & Mitigation Detail

| Threat # | Priority | Threat | STRIDE | Affected Assets | Mitigations | Decision | Status/Notes |
|----------|----------|--------|--------|-----------------|-------------|----------|--------------|
| T-001 | High | TA1 intercepts authentication data in transit, compromising user credentials | Tampering/Info Disclosure | User Credentials, Session Tokens | M-001, M-002 | Mitigate | HTTPS enforced |
| T-002 | High | TA2 uses compromised credentials from external breaches | Spoofing | User Credentials | M-003, M-004 | Mitigate | Cognito detects compromised creds |
| T-003 | Medium | TA5 attempts to spoof device fingerprints to bypass risk assessment | Spoofing | Device Fingerprints | M-005, M-006 | Mitigate | Multiple fingerprint factors |
| T-004 | Medium | TA1 performs credential stuffing attacks against login endpoint | Denial of Service | Authentication Logs | M-007, M-008 | Mitigate | Rate limiting and monitoring |
| T-005 | High | TA6 gains access to environment variables containing secrets | Info Disclosure | Application Secrets | M-009, M-010 | Mitigate | Secure credential management |
| T-006 | Low | TA4 performs session hijacking through network interception | Spoofing | Session Tokens | M-001, M-011 | Mitigate | HTTPS and secure cookies |
| T-007 | Medium | TA5 uses VPN/Tor to mask malicious IP addresses | Spoofing | IP Addresses | M-012, M-013 | Mitigate | IP reputation and behavioral analysis |
| T-008 | Low | TA3 abuses legitimate access for unauthorized activities | Elevation of Privilege | Authentication Logs | M-014, M-015 | Accept | Monitoring and alerting |
| T-009 | Medium | Application logs expose sensitive user information | Info Disclosure | Authentication Logs | M-016, M-017 | Mitigate | Log sanitization |
| T-010 | High | TA1 exploits vulnerabilities in third-party dependencies | Various | All Assets | M-018, M-019 | Mitigate | Dependency management |

## APPENDIX A - APIs

| API | Method | Status | Mutating/Non-Mutating | Functionality | Callable from Internet | Authorized Callers | Comments |
|-----|--------|--------|----------------------|---------------|----------------------|-------------------|----------|
| /api/login | POST | Active | Mutating | Authenticates user with device context data | Yes | Any internet user | Primary authentication endpoint |
| /api/verify-mfa | POST | Active | Mutating | Verifies MFA codes during authentication | Yes | Users with valid session | MFA challenge response |
| /api/config | GET | Active | Non-Mutating | Provides Cognito configuration for client | Yes | Any internet user | Public configuration data |
| /callback | GET | Active | Non-Mutating | Handles Cognito hosted UI redirects | Yes | Cognito service | OAuth callback endpoint |
| /health | GET | Active | Non-Mutating | Application health check | Yes | Any internet user | Monitoring endpoint |

## APPENDIX B - Mitigations

| Mitigation # | Mitigation Description | Threats Mitigating | Status | Related BSC | Comments |
|--------------|------------------------|-------------------|--------|-------------|----------|
| M-001 | HTTPS/TLS 1.2+ encryption for all communications | T-001, T-006 | Complete | BSC-SEC-01 | Browser enforced HTTPS |
| M-002 | Secure session token handling with HttpOnly cookies | T-001 | Complete | BSC-SEC-02 | JWT tokens properly secured |
| M-003 | Cognito Advanced Security compromised credential detection | T-002 | Complete | BSC-SEC-03 | ML-based breach detection |
| M-004 | Adaptive MFA enforcement based on risk assessment | T-002 | Complete | BSC-SEC-04 | Dynamic security controls |
| M-005 | Multi-factor device fingerprinting (user agent, screen, timezone) | T-003 | Complete | BSC-SEC-05 | Harder to spoof multiple factors |
| M-006 | Server-side validation of device fingerprint data | T-003 | Complete | BSC-SEC-06 | Backend validation |
| M-007 | Cognito built-in rate limiting and throttling | T-004 | Complete | BSC-SEC-07 | AWS managed protection |
| M-008 | CloudWatch monitoring and alerting for suspicious activity | T-004, T-008 | Complete | BSC-SEC-08 | Real-time monitoring |
| M-009 | Environment variables for sensitive configuration | T-005 | Complete | BSC-SEC-09 | No secrets in code |
| M-010 | .env file excluded from version control | T-005 | Complete | BSC-SEC-10 | Gitignore protection |
| M-011 | Secure session management with token expiration | T-006 | Complete | BSC-SEC-11 | Limited session lifetime |
| M-012 | IP reputation checking and threat protection rules | T-007 | Complete | BSC-SEC-12 | Cognito threat protection |
| M-013 | Behavioral analysis for impossible travel detection | T-007 | Complete | BSC-SEC-13 | ML-based anomaly detection |
| M-014 | Comprehensive audit logging of authentication events | T-008 | Complete | BSC-SEC-14 | CloudWatch integration |
| M-015 | User event history tracking in Cognito | T-008 | Complete | BSC-SEC-15 | Built-in audit trail |
| M-016 | Log sanitization to prevent sensitive data exposure | T-009 | Complete | BSC-SEC-16 | No PII in logs |
| M-017 | Structured logging with appropriate log levels | T-009 | Complete | BSC-SEC-17 | Controlled information disclosure |
| M-018 | Regular dependency updates and vulnerability scanning | T-010 | Ongoing | BSC-SEC-18 | npm audit and updates |
| M-019 | Minimal dependency footprint and trusted sources | T-010 | Complete | BSC-SEC-19 | AWS official libraries only |