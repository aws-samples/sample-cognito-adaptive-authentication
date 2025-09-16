#!/usr/bin/env node

const { CognitoIdentityProviderClient, UpdateUserPoolClientCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

async function enableUserContextData() {
  const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
  
  try {
    const command = new UpdateUserPoolClientCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      EnablePropagateAdditionalUserContextData: true
    });
    
    await client.send(command);
    console.log('✅ EnablePropagateAdditionalUserContextData set to true');
  } catch (error) {
    console.error('❌ Failed to update client:', error.message);
  }
}

enableUserContextData();