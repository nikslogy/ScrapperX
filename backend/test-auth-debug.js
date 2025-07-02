const { AuthenticationHandler } = require('./dist/services/authenticationHandler');

async function testAuth() {
  const authHandler = new AuthenticationHandler();
  
  const authConfig = {
    type: 'basic',
    credentials: {
      username: 'ckauser',  // Replace with actual username
      password: 'cka@123'   // Replace with actual password  
    }
  };
  
  console.log('🧪 Starting authentication debug test...');
  console.log('📝 Config:', JSON.stringify(authConfig, null, 2));
  
  try {
    const result = await authHandler.testAuthentication(authConfig, 'https://indiandistricts.in/');
    
    console.log('\n🎯 Test Result:');
    console.log(`✅ Success: ${result.success}`);
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    if (result.sessionData) {
      console.log(`📊 Session Data:`, result.sessionData);
    }
    
  } catch (error) {
    console.error('🚨 Test failed with exception:', error);
  }
}

// Run the test
testAuth().then(() => {
  console.log('\n🏁 Authentication test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 