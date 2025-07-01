const axios = require('axios');

async function testCrawler() {
  try {
    console.log('Testing crawler endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/crawler/start-domain-crawl', {
      url: 'https://example.com',
      config: {
        maxPages: 2,
        maxDepth: 1,
        respectRobots: true,
        delay: 1000,
        concurrent: 1
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    }
  }
}

testCrawler(); 