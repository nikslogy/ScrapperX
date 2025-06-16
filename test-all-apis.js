const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAllAPIs() {
  console.log('🧪 Testing All ScrapperX APIs...\n');

  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  async function runTest(name, testFn) {
    try {
      console.log(`🔍 Testing: ${name}`);
      await testFn();
      console.log(`✅ PASSED: ${name}\n`);
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}\n`);
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  // Test 1: Check Robots.txt
  await runTest('Check Robots.txt API', async () => {
    const response = await axios.post(`${API_BASE}/scraper/check-robots`, {
      url: 'https://example.com'
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Robots policy: ${response.data.data.isAllowed ? 'ALLOWED' : 'BLOCKED'}`);
  });

  // Test 2: Static Scraping
  await runTest('Static Scraping API', async () => {
    const response = await axios.post(`${API_BASE}/scraper/scrape-static`, {
      url: 'https://example.com',
      options: { timeout: 10000 }
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Content length: ${response.data.data.content.length} chars`);
    console.log(`   Links found: ${response.data.data.links.length}`);
    console.log(`   Images found: ${response.data.data.images.length}`);
  });

  // Test 3: Intelligent Scraping (Adaptive)
  await runTest('Intelligent Scraping API', async () => {
    const response = await axios.post(`${API_BASE}/scraper/scrape`, {
      url: 'https://httpbin.org/html',
      options: { 
        enableAdaptiveScraping: true,
        learningMode: true,
        timeout: 15000 
      }
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Method used: ${response.data.data.method}`);
    console.log(`   Strategy: ${response.data.data.strategy?.method}`);
    console.log(`   Quality score: ${response.data.data.qualityScore}%`);
  });

  // Test 4: Force Static Method
  await runTest('Force Static Method', async () => {
    const response = await axios.post(`${API_BASE}/scraper/scrape`, {
      url: 'https://httpbin.org/json',
      options: { 
        forceMethod: 'static',
        timeout: 10000 
      }
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Forced method: ${response.data.data.method || response.data.data.strategy?.method}`);
  });

  // Test 5: Adaptive Scraping to Generate Data
  await runTest('Generate Analytics Data', async () => {
    const testUrls = [
      'https://httpbin.org/html',
      'https://httpbin.org/json',
      'https://example.com'
    ];

    for (const url of testUrls) {
      try {
        const response = await axios.post(`${API_BASE}/scraper/scrape`, {
          url,
          options: { 
            forceMethod: 'adaptive',
            learningMode: true,
            timeout: 15000 
          }
        });
        
        if (response.data.success) {
          console.log(`   ✓ Scraped ${url} successfully`);
        }
      } catch (error) {
        console.log(`   ⚠️ Failed to scrape ${url}: ${error.message}`);
      }
    }
  });

  // Test 6: Check Analytics After Scraping
  await runTest('Check Analytics Data', async () => {
    const response = await axios.get(`${API_BASE}/scraper/adaptive/success-rates`);
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Total domains: ${response.data.data?.totalDomains || 0}`);
    console.log(`   Success rates available: ${response.data.data?.successRates?.length || 0} domains`);
    
    if (response.data.data?.successRates?.length > 0) {
      console.log(`   Sample domain: ${response.data.data.successRates[0].domain}`);
      console.log(`   Sample difficulty: ${response.data.data.successRates[0].difficulty}`);
    }
  });

  // Test 7: Get Adaptive Stats
  await runTest('Get Adaptive Stats API', async () => {
    const response = await axios.get(`${API_BASE}/scraper/adaptive/stats`);
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Stats data available: ${response.data.data ? 'Yes' : 'No'}`);
  });

  // Test 8: Export Profiles
  await runTest('Export Profiles API', async () => {
    const response = await axios.get(`${API_BASE}/scraper/adaptive/export`);
    console.log(`   Export data length: ${response.data.length || 0} chars`);
  });

  // Test 9: Import Profiles
  await runTest('Import Profiles API', async () => {
    const testProfile = [{
      domain: 'test.example.com',
      characteristics: {
        hasAntiBot: false,
        requiresJS: true,
        hasRateLimit: false,
        hasCaptcha: false,
        difficulty: 'easy'
      },
      successRates: {
        static: 0.8,
        dynamic: 0.9,
        stealth: 0.95
      },
      optimalStrategy: {
        type: 'dynamic',
        confidence: 90,
        options: {}
      },
      lastUpdated: new Date().toISOString(),
      totalAttempts: 10,
      recentFailures: []
    }];

    const response = await axios.post(`${API_BASE}/scraper/adaptive/import`, {
      profiles: JSON.stringify(testProfile)
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Import successful: ${response.data.message}`);
  });

  // Test 10: Verify Import Worked
  await runTest('Verify Import Worked', async () => {
    const response = await axios.get(`${API_BASE}/scraper/adaptive/success-rates`);
    
    if (!response.data.success) throw new Error('API returned success: false');
    
    const hasTestDomain = response.data.data?.successRates?.some(
      (rate) => rate.domain === 'test.example.com'
    );
    
    if (!hasTestDomain) {
      throw new Error('Imported profile not found in success rates');
    }
    
    console.log(`   ✓ Imported profile found in analytics`);
  });

  // Test 11: Get Specific Domain Stats
  await runTest('Get Specific Domain Stats', async () => {
    const response = await axios.get(`${API_BASE}/scraper/adaptive/stats?domain=test.example.com`);
    
    if (!response.data.success) throw new Error('API returned success: false');
    
    if (!response.data.data) {
      throw new Error('No data returned for specific domain');
    }
    
    console.log(`   Domain: ${response.data.data.domain || 'N/A'}`);
    console.log(`   Difficulty: ${response.data.data.characteristics?.difficulty || 'N/A'}`);
  });

  // Test 12: Clear Profile
  await runTest('Clear Profile API', async () => {
    const response = await axios.delete(`${API_BASE}/scraper/adaptive/profile/test.example.com`);
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Profile cleared: ${response.data.message}`);
  });

  // Test 13: Stealth Scraping
  await runTest('Stealth Scraping API', async () => {
    const response = await axios.post(`${API_BASE}/scraper/scrape`, {
      url: 'https://httpbin.org/user-agent',
      options: { 
        forceMethod: 'stealth',
        stealthLevel: 'advanced',
        timeout: 20000 
      }
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Method used: ${response.data.data.method || response.data.data.strategy?.method}`);
  });

  // Test 14: Force Dynamic Method
  await runTest('Force Dynamic Method', async () => {
    const response = await axios.post(`${API_BASE}/scraper/scrape`, {
      url: 'https://httpbin.org/html',
      options: { 
        forceMethod: 'dynamic',
        timeout: 15000 
      }
    });
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Forced method: ${response.data.data.method || response.data.data.strategy?.method}`);
  });

  // Test 15: Get Success Rates
  await runTest('Get Success Rates API', async () => {
    const response = await axios.get(`${API_BASE}/scraper/adaptive/success-rates`);
    
    if (!response.data.success) throw new Error('API returned success: false');
    console.log(`   Total domains: ${response.data.data?.totalDomains || 0}`);
    console.log(`   Success rates available: ${response.data.data?.successRates?.length || 0} domains`);
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => console.log(`   - ${test.name}: ${test.error}`));
  }

  console.log('\n🎉 API Testing Complete!');
  
  return testResults;
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAllAPIs().catch(console.error);
}

module.exports = { testAllAPIs }; 