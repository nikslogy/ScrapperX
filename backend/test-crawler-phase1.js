const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/crawler';

async function testPhase1Crawler() {
  console.log('🧪 Testing Phase 1: Domain Crawler Foundation');
  console.log('================================================\n');

  try {
    // Test 1: Start domain crawl
    console.log('Test 1: Starting domain crawl...');
    const crawlResponse = await axios.post(`${API_BASE}/start-domain-crawl`, {
      url: 'https://example.com',
      config: {
        maxPages: 5,
        maxDepth: 2,
        respectRobots: true,
        delay: 2000,
        concurrent: 2,
        includePatterns: [],
        excludePatterns: ['/admin', '/login'],
        timeout: 30000
      }
    });

    if (crawlResponse.data.success) {
      console.log('✅ Crawl started successfully');
      console.log(`   Session ID: ${crawlResponse.data.data.sessionId}`);
      
      const sessionId = crawlResponse.data.data.sessionId;
      
      // Test 2: Monitor progress
      console.log('\nTest 2: Monitoring crawl progress...');
      
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts with 5 second intervals = 2.5 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
          const statusResponse = await axios.get(`${API_BASE}/session/${sessionId}/status`);
          const progressResponse = await axios.get(`${API_BASE}/session/${sessionId}/progress`);
          
          if (statusResponse.data.success) {
            const session = statusResponse.data.data.session;
            const progress = progressResponse.data.success ? progressResponse.data.data : null;
            
            console.log(`   Status: ${session.status}`);
            if (progress) {
              console.log(`   Progress: ${progress.processedUrls}/${progress.totalUrls} URLs processed`);
              console.log(`   Current URL: ${progress.currentUrl || 'N/A'}`);
              console.log(`   Extracted Items: ${progress.extractedItems}`);
              console.log(`   Failed URLs: ${progress.failedUrls}`);
            }
            
            if (session.status === 'completed' || session.status === 'failed') {
              console.log(`✅ Crawl ${session.status}`);
              break;
            }
          }
        } catch (error) {
          console.log(`   Error checking status: ${error.message}`);
        }
        
        attempts++;
        console.log(`   Attempt ${attempts}/${maxAttempts} - Waiting...`);
      }
      
      if (attempts >= maxAttempts) {
        console.log('⚠️  Crawl monitoring timed out');
      }
      
      // Test 3: Get extracted content
      console.log('\nTest 3: Getting extracted content...');
      try {
        const contentResponse = await axios.get(`${API_BASE}/session/${sessionId}/content?limit=10`);
        
        if (contentResponse.data.success) {
          const content = contentResponse.data.data.content;
          console.log(`✅ Retrieved ${content.length} content items`);
          
          if (content.length > 0) {
            console.log('   Sample content:');
            content.slice(0, 3).forEach((item, index) => {
              console.log(`   ${index + 1}. URL: ${item.url}`);
              console.log(`      Title: ${item.metadata.title || 'N/A'}`);
              console.log(`      Chunks: ${item.contentChunks.length}`);
              console.log(`      Status: ${item.processingStatus}`);
            });
          }
        } else {
          console.log('❌ Failed to get content');
        }
      } catch (error) {
        console.log(`❌ Error getting content: ${error.message}`);
      }
      
      // Test 4: Export data
      console.log('\nTest 4: Exporting session data...');
      try {
        const exportResponse = await axios.get(`${API_BASE}/session/${sessionId}/export?format=json`);
        
        if (exportResponse.data.session && exportResponse.data.content) {
          console.log('✅ Export successful');
          console.log(`   Session: ${exportResponse.data.session.domain}`);
          console.log(`   Content items: ${exportResponse.data.content.length}`);
        } else {
          console.log('❌ Export failed');
        }
      } catch (error) {
        console.log(`❌ Error exporting: ${error.message}`);
      }
      
      // Test 5: Get all sessions
      console.log('\nTest 5: Getting all sessions...');
      try {
        const sessionsResponse = await axios.get(`${API_BASE}/sessions`);
        
        if (sessionsResponse.data.success) {
          console.log(`✅ Retrieved ${sessionsResponse.data.data.length} sessions`);
        } else {
          console.log('❌ Failed to get sessions');
        }
      } catch (error) {
        console.log(`❌ Error getting sessions: ${error.message}`);
      }
      
      // Test 6: Cleanup (optional)
      console.log('\nTest 6: Cleanup session...');
      try {
        const deleteResponse = await axios.delete(`${API_BASE}/session/${sessionId}`);
        
        if (deleteResponse.data.success) {
          console.log('✅ Session deleted successfully');
        } else {
          console.log('❌ Failed to delete session');
        }
      } catch (error) {
        console.log(`❌ Error deleting session: ${error.message}`);
      }
      
    } else {
      console.log('❌ Failed to start crawl');
      console.log(crawlResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response ? error.response.data : error.message);
  }
  
  console.log('\n================================================');
  console.log('🏁 Phase 1 Testing Complete');
}

// Run the test
testPhase1Crawler().catch(console.error); 