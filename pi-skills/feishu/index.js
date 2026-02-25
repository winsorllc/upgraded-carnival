#!/usr/bin/env node

/**
 * Lark/Feishu API Integration
 * Send messages, manage documents, users, and workspace
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class FeishuClient {
  constructor(config = {}) {
    this.appId = config.appId || process.env.FEISHU_APP_ID;
    this.appSecret = config.appSecret || process.env.FEISHU_APP_SECRET;
    this.token = null;
    this.tokenExpiry = 0;
  }

  /**
   * Make HTTP request to Feishu API
   */
  request(method, path, body = null, retries = 3) {
    return new Promise(async (resolve, reject) => {
      // Auto-refresh token if expired
      if (!this.token || Date.now() >= this.tokenExpiry) {
        try {
          await this.getAccessToken();
        } catch (e) {
          reject(e);
          return;
        }
      }

      const url = new URL(path, 'https://open.feishu.cn');
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.code && json.code !== 0) {
              // Token expired, retry with refresh
              if (json.code === 99991663 && retries > 0) {
                this.token = null;
                this.request(method, path, body, retries - 1)
                  .then(resolve)
                  .catch(reject);
                return;
              }
              reject(new Error(`API Error ${json.code}: ${json.msg}`));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Get tenant access token
   */
  async getAccessToken() {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret
      });

      const options = {
        hostname: 'open.feishu.cn',
        port: 443,
        path: '/open-apis/auth/v3/tenant_access_token/internal',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.tenant_access_token) {
              this.token = json.tenant_access_token;
              this.tokenExpiry = Date.now() + (json.expire - 60) * 1000;
              resolve(this.token);
            } else {
              reject(new Error('Failed to get token'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  // ── Messages ─────────────────────────────────────────────────

  /**
   * Send text message
   * @param {string} receiveId - open_id, user_id, chat_id, or union_id
   * @param {string} text - Message text
   * @param {string} msgType - 'text', 'post' (rich), 'interactive' (card)
   */
  async sendMessage(receiveId, text, msgType = 'text') {
    let content;
    
    if (msgType === 'text') {
      content = JSON.stringify({ text });
    } else if (msgType === 'post') {
      content = JSON.stringify({
        post: {
          zh_cn: {
            title: '',
            content: [[{ tag: 'text', text }]]
          }
        }
      });
    } else {
      content = JSON.stringify({ text });
    }

    return this.request('POST', '/open-apis/im/v1/messages', {
      receive_id: receiveId,
      msg_type: msgType,
      content
    });
  }

  /**
   * Send interactive card message
   */
  async sendCard(receiveId, cardContent) {
    return this.request('POST', '/open-apis/im/v1/messages', {
      receive_id: receiveId,
      msg_type: 'interactive',
      content: JSON.stringify(cardContent)
    });
  }

  /**
   * Upload image
   */
  async uploadImage(imagePath, imageType = 'image/png') {
    const fs = require('fs');
    const boundary = '----FeishuBoundary' + Date.now();
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="image"; filename="${imagePath}"`,
      `Content-Type: ${imageType}`,
      '',
      fs.readFileSync(imagePath).toString('binary'),
      `--${boundary}--`
    ].join('\r\n');

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'open.feishu.cn',
        port: 443,
        path: '/open-apis/im/v1/images',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // ── Documents ─────────────────────────────────────────────────

  /**
   * Create a document
   */
  async createDocument(title, documentType = 'docx') {
    return this.request('POST', '/open-apis/doc/v3/documents/', {
      document: { title, document_type: documentType }
    });
  }

  /**
   * Get document content
   */
  async getDocumentContent(documentId) {
    return this.request('GET', `/open-apis/doc/v3/documents/${documentId}/content`);
  }

  /**
   * Append content to document
   */
  async appendDocumentContent(documentId, content) {
    // content is array of block objects
    return this.request('PATCH', `/open-apis/doc/v3/documents/${documentId}/content`, {
      requests: content.map(block => ({
        insert: { block: block }
      }))
    });
  }

  // ── Users ─────────────────────────────────────────────────

  /**
   * Get user info
   */
  async getUser(userId) {
    return this.request('GET', `/open-apis/contact/v3/users/${userId}`);
  }

  /**
   * List users in department
   */
  async listUsers(departmentId = '0', pageSize = 100) {
    return this.request('GET', 
      `/open-apis/contact/v3/users?department_id=${departmentId}&page_size=${pageSize}`
    );
  }

  /**
   * Get current user (me)
   */
  async getCurrentUser() {
    return this.request('GET', '/open-apis/identity/v1/end_user/me');
  }

  // ── Chat/Space ─────────────────────────────────────────────────

  /**
   * Create a chat (group)
   */
  async createChat(name, userIds = []) {
    return this.request('POST', '/open-apis/im/v1/chats', {
      name,
      user_id_list: userIds
    });
  }

  /**
   * List my chats
   */
  async listChats() {
    return this.request('GET', '/open-apis/im/v1/chats');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const client = new FeishuClient();

  (async () => {
    try {
      switch (command) {
        case 'send':
          const recipient = args[1];
          const message = args[2];
          if (!recipient || !message) {
            console.error('Usage: feishu send <recipient_id> <message>');
            process.exit(1);
          }
          await client.sendMessage(recipient, message);
          console.log('Message sent successfully');
          break;
          
        case 'token':
          const token = await client.getAccessToken();
          console.log('Token obtained:', token.substring(0, 20) + '...');
          break;
          
        case 'user':
          if (!args[1]) {
            console.error('Usage: feishu user <user_id>');
            process.exit(1);
          }
          const user = await client.getUser(args[1]);
          console.log(JSON.stringify(user, null, 2));
          break;
          
        case 'doc':
          if (!args[1]) {
            console.error('Usage: feishu doc create <title>');
            process.exit(1);
          }
          const doc = await client.createDocument(args.slice(1).join(' '));
          console.log('Document created:', JSON.stringify(doc, null, 2));
          break;
          
        default:
          console.log('Feishu CLI Commands:');
          console.log('  send <id> <msg>   - Send message');
          console.log('  token             - Get access token');
          console.log('  user <id>         - Get user info');
          console.log('  doc <title>       - Create document');
      }
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { FeishuClient };
