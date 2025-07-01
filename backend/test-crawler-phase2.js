const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/crawler';

async function testPhase2AIAnalysis() {
  console.log('🧪 Testing Phase 2: AI Content Analysis & Pattern Recognition');
  console.log('==========================================================\n');

  try {
    // Test 1: Start domain crawl (same as Phase 1)
    console.log('Test 1: Starting domain crawl for AI analysis...');
    const crawlResponse = await axios.post(`${API_BASE}/start-domain-crawl`, {
      url: 'https://zeenews.india.com/marathi',
      config: {
        maxPages: 3,
        maxDepth: 2,
        respectRobots: true,
        delay: 2000,
        concurrent: 1,
        includePatterns: [],
        excludePatterns: ['/admin', '/login'],
        timeout: 30000
      }
    });

    if (!crawlResponse.data.success) {
      console.log('❌ Failed to start crawl');
      console.log(crawlResponse.data);
      return;
    }

    console.log('✅ Crawl started successfully');
    console.log(`   Session ID: ${crawlResponse.data.data.sessionId}`);
    
    const sessionId = crawlResponse.data.data.sessionId;
    
    // Test 2: Wait for crawl completion
    console.log('\nTest 2: Waiting for crawl completion...');
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minute timeout
    let crawlCompleted = false;
    
    while (attempts < maxAttempts && !crawlCompleted) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const statusResponse = await axios.get(`${API_BASE}/session/${sessionId}/status`);
        
        if (statusResponse.data.success) {
          const session = statusResponse.data.data.session;
          console.log(`   Status: ${session.status}`);
          
          if (session.status === 'completed') {
            console.log('✅ Crawl completed successfully');
            crawlCompleted = true;
            break;
          } else if (session.status === 'failed') {
            console.log('❌ Crawl failed');
            return;
          }
        }
      } catch (error) {
        console.log(`   Error checking status: ${error.message}`);
      }
      
      attempts++;
      console.log(`   Waiting... ${attempts}/${maxAttempts}`);
    }
    
    if (!crawlCompleted) {
      console.log('⚠️  Crawl did not complete within timeout');
      return;
    }

    // Test 3: Check AI Analysis
    console.log('\nTest 3: Checking AI analysis results...');
    try {
      const aiAnalysisResponse = await axios.get(`${API_BASE}/session/${sessionId}/ai-analysis`);
      
      if (aiAnalysisResponse.data.success) {
        const analysis = aiAnalysisResponse.data.data;
        console.log('✅ AI Analysis completed:');
        console.log(`   - Primary Content Type: ${analysis.primaryContentType}`);
        console.log(`   - Quality Score: ${analysis.qualityScore}/100`);
        console.log(`   - Patterns Found: ${analysis.patternsFound}`);
        console.log(`   - Average Confidence: ${(analysis.averageConfidence * 100).toFixed(1)}%`);
        console.log(`   - Analyzed Pages: ${analysis.analyzedPages}`);
        console.log(`   - Content Types:`, analysis.contentTypes);
        
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          console.log('   - Recommendations:');
          analysis.recommendations.forEach((rec, index) => {
            console.log(`     ${index + 1}. ${rec}`);
          });
        }
      } else {
        console.log('❌ AI Analysis not available');
        console.log('   This might be because:');
        console.log('   - OPENROUTER_API_KEY is not set in environment');
        console.log('   - AI analysis failed during processing');
        console.log('   - Analysis is still running (try again later)');
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('❌ AI Analysis not found');
        console.log('   This usually means the AI analysis didn\'t complete or failed');
      } else {
        console.log(`❌ Error getting AI analysis: ${error.message}`);
      }
    }

    // Test 4: Check Pattern Analysis
    console.log('\nTest 4: Checking pattern analysis...');
    try {
      const patternResponse = await axios.get(`${API_BASE}/session/${sessionId}/pattern-analysis`);
      
      if (patternResponse.data.success) {
        const patternData = patternResponse.data.data.patternAnalysis;
        console.log('✅ Pattern Analysis available:');
        console.log(`   - Total Patterns: ${patternData.statistics.totalPatterns}`);
        console.log(`   - Average Confidence: ${(patternData.statistics.averageConfidence * 100).toFixed(1)}%`);
        console.log(`   - Content Distribution:`, patternData.statistics.contentTypeDistribution);
        
        if (patternData.patterns && patternData.patterns.length > 0) {
          console.log('   - Top Patterns:');
          patternData.patterns.slice(0, 3).forEach((pattern, index) => {
            console.log(`     ${index + 1}. ${pattern.type} (confidence: ${(pattern.confidence * 100).toFixed(1)}%)`);
            console.log(`        Description: ${pattern.description}`);
          });
        }
      } else {
        console.log('❌ Pattern Analysis failed');
      }
    } catch (error) {
      console.log(`❌ Error getting pattern analysis: ${error.message}`);
    }

    // Test 5: Check enhanced content with AI metadata
    console.log('\nTest 5: Checking enhanced content with AI metadata...');
    try {
      const contentResponse = await axios.get(`${API_BASE}/session/${sessionId}/content?limit=5`);
      
      if (contentResponse.data.success) {
        const content = contentResponse.data.data.content;
        console.log(`✅ Retrieved ${content.length} content items with AI enhancements:`);
        
        content.forEach((item, index) => {
          console.log(`\n   Content ${index + 1}:`);
          console.log(`   - URL: ${item.url}`);
          console.log(`   - Title: ${item.metadata.title || 'N/A'}`);
          console.log(`   - Processing Status: ${item.processingStatus}`);
          
          if (item.metadata.aiContentType) {
            console.log(`   - AI Content Type: ${item.metadata.aiContentType}`);
            console.log(`   - AI Confidence: ${(item.metadata.confidence * 100).toFixed(1)}%`);
            console.log(`   - Relevance Score: ${(item.metadata.relevanceScore * 100).toFixed(1)}%`);
          }
          
          if (item.metadata.aiAnalysis) {
            console.log(`   - AI Analysis: ${item.metadata.aiAnalysis.patterns} patterns, ${item.metadata.aiAnalysis.extractedFields} fields`);
            console.log(`   - Reasoning: ${item.metadata.aiAnalysis.reasoning.substring(0, 100)}...`);
          }
          
          if (item.metadata.structuredData && Object.keys(item.metadata.structuredData).length > 0) {
            console.log(`   - Structured Data Fields: ${Object.keys(item.metadata.structuredData).join(', ')}`);
          }
        });
      } else {
        console.log('❌ Failed to get enhanced content');
      }
    } catch (error) {
      console.log(`❌ Error getting enhanced content: ${error.message}`);
    }

    // Test 6: Export with AI analysis
    console.log('\nTest 6: Testing export with AI analysis data...');
    try {
      const exportResponse = await axios.get(`${API_BASE}/session/${sessionId}/export?format=json`);
      
      if (exportResponse.data.session && exportResponse.data.content) {
        console.log('✅ Export with AI data successful:');
        console.log(`   - Session Domain: ${exportResponse.data.session.domain}`);
        console.log(`   - Content Items: ${exportResponse.data.content.length}`);
        
        // Check if AI analysis data is included in export
        if (exportResponse.data.session.stats && exportResponse.data.session.stats.aiAnalysis) {
          console.log('   - AI Analysis included in export ✅');
          const aiStats = exportResponse.data.session.stats.aiAnalysis;
          console.log(`     * Primary Type: ${aiStats.primaryContentType}`);
          console.log(`     * Quality Score: ${aiStats.qualityScore}`);
        } else {
          console.log('   - AI Analysis not included in export ⚠️');
        }
        
        // Check enhanced content in export
        const enhancedItems = exportResponse.data.content.filter(item => 
          item.metadata && (item.metadata.aiContentType || item.metadata.confidence || item.metadata.relevanceScore)
        );
        console.log(`   - Enhanced content items: ${enhancedItems.length}/${exportResponse.data.content.length}`);
        
      } else {
        console.log('❌ Export failed');
      }
    } catch (error) {
      console.log(`❌ Error during export: ${error.message}`);
    }

    // Test 7: Cleanup
    console.log('\nTest 7: Cleaning up session...');
    try {
      const deleteResponse = await axios.delete(`${API_BASE}/session/${sessionId}`);
      
      if (deleteResponse.data.success) {
        console.log('✅ Session cleaned up successfully');
      } else {
        console.log('❌ Failed to clean up session');
      }
    } catch (error) {
      console.log(`❌ Error cleaning up session: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response ? error.response.data : error.message);
  }
  
  console.log('\n==========================================================');
  console.log('🏁 Phase 2 AI Analysis Testing Complete');
  console.log('\nNote: If AI features are not working:');
  console.log('1. Make sure OPENROUTER_API_KEY is set in your .env file');
  console.log('2. Get a free API key from https://openrouter.ai/');
  console.log('3. The system will fall back to heuristic analysis without AI');
}

// Run the test
testPhase2AIAnalysis().catch(console.error); 
 