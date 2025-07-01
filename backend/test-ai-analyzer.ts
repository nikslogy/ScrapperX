import { AIContentAnalyzer } from './src/services/aiContentAnalyzer';

const analyzer = new AIContentAnalyzer();

const mockContent = {
  url: 'https://tramechiara.com',
  metadata: { title: 'Test Page', description: 'A test page for AI analysis' },
  contentChunks: [
    { type: 'article', content: 'This is a sample article about testing.', confidence: 0.8 }
  ],
  textContent: 'This is a sample article about testing. Price: $10. Contact: test@example.com'
};

analyzer.analyzeContent(mockContent as any).then(result => {
  console.log('AI Analysis Result:', result);
});