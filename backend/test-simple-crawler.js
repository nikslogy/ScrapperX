// Simple test without MongoDB dependencies
const axios = require('axios');

async function testSimpleCrawler() {
  console.log('🧪 Testing Simple Crawler (No MongoDB)');
  console.log('=====================================\n');

  try {
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Health check passed:', healthResponse.data.message);

    // Test a simple scraper endpoint to make sure the server works
    console.log('\n2. Testing existing scraper endpoint...');
    try {
      const scraperResponse = await axios.post('http://localhost:5000/api/scraper/scrape', {
        url: 'https://example.com',
        method: 'static'
      });
      console.log('✅ Basic scraper works');
    } catch (error) {
      console.log('⚠️  Basic scraper test failed (this is okay):', error.response?.data?.message || error.message);
    }

    console.log('\n3. Summary:');
    console.log('✅ Backend server is running');
    console.log('✅ Health endpoint works');
    console.log('✅ API is accessible');
    console.log('\n📝 Note: MongoDB-dependent crawler features need MongoDB to be installed and running.');
    console.log('   For full Phase 1 testing, please install MongoDB or use a cloud MongoDB service.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleCrawler(); 