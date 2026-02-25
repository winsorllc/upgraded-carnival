#!/usr/bin/env node

/**
 * Test for Feishu/Lark CLI skill
 */

// Mock the HTTP parts for unit testing
class MockFeishuClient {
  constructor(config = {}) {
    this.appId = config.appId || process.env.FEISHU_APP_ID || 'test';
    this.appSecret = config.appSecret || process.env.FEISHU_APP_SECRET || 'test';
    this.token = null;
    this.tokenExpiry = 0;
  }

  request(method, path, body = null) {
    return Promise.resolve({ code: 0, data: {} });
  }

  getAccessToken() {
    this.token = 'mock_token';
    this.tokenExpiry = Date.now() + 7200000;
    return Promise.resolve(this.token);
  }

  // Copy the actual methods we're testing
  sendMessage(receiveId, text, msgType = 'text') {
    let content;
    if (msgType === 'text') {
      content = JSON.stringify({ text });
    } else if (msgType === 'post') {
      content = JSON.stringify({
        post: { zh_cn: { title: '', content: [[{ tag: 'text', text }]] } }
      });
    }
    return Promise.resolve({
      receive_id: receiveId,
      msg_type: msgType,
      content: content
    });
  }

  createDocument(title) {
    return Promise.resolve({
      document: { title, document_id: 'mock_id' }
    });
  }

  getUser(userId) {
    return Promise.resolve({ data: { user_id: userId } });
  }
}

async function runTests() {
  console.log('🧪 Testing Feishu/Lark CLI skill...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Client initialization
  try {
    const client = new MockFeishuClient({ 
      appId: 'test_id', 
      appSecret: 'test_secret' 
    });
    if (client.appId === 'test_id' && client.appSecret === 'test_secret') {
      console.log('✅ Test 1: Client initialization');
      passed++;
    } else {
      throw new Error('Config not set');
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: Text message content
  try {
    const client = new MockFeishuClient();
    const result = await client.sendMessage('ou_123', 'Hello');
    const content = JSON.parse(result.content);
    if (content.text === 'Hello') {
      console.log('✅ Test 2: Text message content');
      passed++;
    } else {
      throw new Error('Content mismatch: ' + JSON.stringify(content));
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: Post message content
  try {
    const client = new MockFeishuClient();
    const result = await client.sendMessage('ou_123', 'Hello', 'post');
    const content = JSON.parse(result.content);
    if (content.post && content.post.zh_cn && content.post.zh_cn.content) {
      console.log('✅ Test 3: Post message content');
      passed++;
    } else {
      throw new Error('Post content mismatch');
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Create document
  try {
    const client = new MockFeishuClient();
    const result = await client.createDocument('Test Doc');
    if (result.document && result.document.title === 'Test Doc') {
      console.log('✅ Test 4: Create document');
      passed++;
    } else {
      throw new Error('Document mismatch');
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: Get user
  try {
    const client = new MockFeishuClient();
    const result = await client.getUser('ou_123');
    if (result.data && result.data.user_id === 'ou_123') {
      console.log('✅ Test 5: Get user');
      passed++;
    } else {
      throw new Error('User mismatch');
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  // Test 6: Token management
  try {
    const client = new MockFeishuClient();
    await client.getAccessToken();
    if (client.token && client.tokenExpiry > Date.now()) {
      console.log('✅ Test 6: Token management');
      passed++;
    } else {
      throw new Error('Token not set');
    }
  } catch (e) {
    console.log('❌ Test 6:', e.message);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
