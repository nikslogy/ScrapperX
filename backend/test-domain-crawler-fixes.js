const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/crawler';

async function testDomainCrawlerFixes() {
  console.log('🔧 Testing Domain Crawler Fixes');
  console.log('================================\n');

  try {
    // Test 1: Start a small crawl
    console.log('Test 1: Starting small domain crawl...');
    const crawlResponse = await axios.post(`${API_BASE}/start-domain-crawl`, {
      url: 'https://example.com',
      config: {
        maxPages: 3,
        maxDepth: 2,
        respectRobots: true,
        delay: 1000,
        concurrent: 1,
        includePatterns: [],
        excludePatterns: ['/admin', '/login'],
        timeout: 20000,
        extraction: {
          enableStructuredData: true,
          dataTypes: ['product', 'article', 'contact'],
          qualityThreshold: 0.7
        }
      }
    });

    if (!crawlResponse.data.success) {
      throw new Error('Failed to start crawl');
    }

    const sessionId = crawlResponse.data.data.sessionId;
    console.log('✅ Crawl started successfully');
    console.log(`   Session ID: ${sessionId}\n`);

    // Test 2: Monitor real-time progress with improved polling
    console.log('Test 2: Monitoring real-time progress...');
    
    let attempts = 0;
    const maxAttempts = 20;
    let lastStatus = 'pending';
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      attempts++;
      
      try {
        // Get session status
        const statusResponse = await axios.get(`${API_BASE}/session/${sessionId}/status`);
        
        if (statusResponse.data.success) {
          const session = statusResponse.data.data.session;
          const progress = statusResponse.data.data.progress;
          
          // Only log if status changed or every 3rd attempt
          if (session.status !== lastStatus || attempts % 3 === 0) {
            console.log(`   Attempt ${attempts}/${maxAttempts}:`);
            console.log(`     Status: ${session.status}`);
            
            if (progress) {
              console.log(`     Progress: ${progress.processedUrls}/${progress.totalUrls} URLs`);
              console.log(`     Extracted Items: ${progress.extractedItems}`);
              console.log(`     Failed URLs: ${progress.failedUrls}`);
              if (progress.currentUrl) {
                console.log(`     Current URL: ${progress.currentUrl}`);
              }
            }
            
            lastStatus = session.status;
          }
          
          if (session.status === 'completed') {
            console.log('✅ Crawl completed successfully!\n');
            
            // Test 3: Check AI analysis results
            console.log('Test 3: Checking AI analysis results...');
            if (session.stats && session.stats.aiAnalysis) {
              const ai = session.stats.aiAnalysis;
              console.log('✅ AI Analysis found:');
              console.log(`   Primary content type: ${ai.primaryContentType}`);
              console.log(`   Quality score: ${ai.qualityScore}/100`);
              console.log(`   Patterns found: ${ai.patternsFound}`);
              console.log(`   Average confidence: ${(ai.averageConfidence * 100).toFixed(1)}%`);
              console.log(`   Analyzed pages: ${ai.analyzedPages}`);
            } else {
              console.log('⚠️  No AI analysis results found');
            }
            break;
            
          } else if (session.status === 'failed') {
            console.log('❌ Crawl failed');
            break;
            
          } else if (session.status === 'running' && attempts === 1) {
            console.log('✅ Real-time status updates working - crawl is running');
          }
        }
        
      } catch (error) {
        console.log(`   ⚠️  Status check error: ${error.message}`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Test timed out - this might be normal for larger crawls\n');
    }
    
    // Test 4: Verify session can be retrieved
    console.log('Test 4: Verifying session retrieval...');
    try {
      const finalStatusResponse = await axios.get(`${API_BASE}/session/${sessionId}/status`);
      if (finalStatusResponse.data.success) {
        console.log('✅ Session retrieval working');
        console.log(`   Final status: ${finalStatusResponse.data.data.session.status}`);
      }
    } catch (error) {
      console.log(`❌ Session retrieval failed: ${error.message}`);
    }
    
    console.log('\n🎉 Domain Crawler fixes test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testDomainCrawlerFixes().catch(console.error); 