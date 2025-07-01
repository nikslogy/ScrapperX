const axios = require('axios');

async function testServerHealth() {
  console.log('🔍 Testing server health...');
  
  try {
    // Test health endpoint
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is responding');
    console.log('   Status:', response.status);
    console.log('   Data:', response.data);
    
    // Test sessions endpoint
    try {
      const sessionsResponse = await axios.get('http://localhost:5000/api/crawler/sessions');
      console.log('✅ Crawler endpoints accessible');
      console.log('   Sessions count:', sessionsResponse.data.data ? sessionsResponse.data.data.length : 0);
    } catch (error) {
      console.log('❌ Crawler endpoints error:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Server not responding');
    console.log('   Error:', error.message);
    console.log('   Make sure the server is running with: npm run dev');
  }
}

testServerHealth().catch(console.error); 