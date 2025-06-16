const axios = require('axios');

async function quickTest() {
  console.log('🧪 Quick Analytics Test...');
  
  try {
    // Test 1: Scrape with adaptive to generate data
    console.log('1. Scraping with adaptive to generate analytics...');
    const scrapeResponse = await axios.post('http://localhost:5000/api/scraper/scrape', {
      url: 'https://httpbin.org/html',
      options: { 
        forceMethod: 'adaptive',
        learningMode: true,
        timeout: 15000 
      }
    });
    
    if (scrapeResponse.data.success) {
      console.log('✅ Adaptive scraping successful');
    } else {
      console.log('❌ Adaptive scraping failed');
      return;
    }
    
    // Test 2: Check analytics
    console.log('2. Checking analytics...');
    const analyticsResponse = await axios.get('http://localhost:5000/api/scraper/adaptive/success-rates');
    
    if (analyticsResponse.data.success) {
      console.log('✅ Analytics API working');
      console.log('📊 Total domains:', analyticsResponse.data.data?.totalDomains || 0);
      console.log('📊 Success rates available:', analyticsResponse.data.data?.successRates?.length || 0);
      
      if (analyticsResponse.data.data?.successRates?.length > 0) {
        console.log('🎉 Analytics data is now available!');
        console.log('Sample domain:', analyticsResponse.data.data.successRates[0].domain);
      } else {
        console.log('⚠️ No analytics data found');
      }
    } else {
      console.log('❌ Analytics API failed');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

quickTest(); 