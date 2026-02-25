#!/usr/bin/env node
/**
 * Webhook Forwarder - Route webhooks to multiple destinations
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');

class WebhookForwarder {
  constructor() {
    this.destinations = [];
    this.retries = 3;
    this.timeout = 30000;
  }

  async forward(webhookUrl, payload, headers = {}) {
    const parsed = new URL(webhookUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'PopeBot-Webhook/1.0',
        ...headers,
      },
      timeout: this.timeout,
    };

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    });
  }

  async forwardWithRetry(webhookUrl, payload, headers = {}) {
    let lastError;
    
    for (let i = 0; i < this.retries; i++) {
      try {
        return await this.forward(webhookUrl, payload, headers);
      } catch (error) {
        lastError = error;
        if (i < this.retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  async test(webhookUrl) {
    console.log(`Testing webhook: ${webhookUrl}`);
    
    try {
      const response = await this.forward(webhookUrl, JSON.stringify({
        event: 'test',
        timestamp: new Date().toISOString(),
        message: 'Test webhook from PopeBot',
      }));
      
      console.log(`Status: ${response.statusCode}`);
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (error) {
      console.error(`Failed: ${error.message}`);
      return false;
    }
  }

  async send(webhookUrl, payload, options = {}) {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = options.signature ? this.sign(payloadStr, options.signature) : null;
    
    const headers = {};
    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    return await this.forwardWithRetry(webhookUrl, payloadStr, headers);
  }

  sign(payload, secret) {
    const crypto = require('crypto');
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help') {
      console.log('Webhook Forwarder - Route webhooks to destinations');
      console.log('');
      console.log('Commands:');
      console.log('  send <url> --payload \'{"key":"value"}\'     Send webhook');
      console.log('  test <url>                                   Test webhook endpoint');
      console.log('  server --port 3000                          Start webhook server');
      console.log('');
      console.log('Options:');
      console.log('  --payload JSON                             Payload to send');
      console.log('  --signature SECRET                         Sign with HMAC-SHA256');
      console.log('  --retries N                                Number of retries (default: 3)');
      console.log('  --timeout MS                               Request timeout (default: 30000)');
      process.exit(0);
    }

    if (command === 'send') {
      const webhookUrl = args[1];
      const payloadIdx = args.indexOf('--payload');
      const payload = payloadIdx > -1 ? args[payloadIdx + 1] : '{"event":"test"}';
      const signatureIdx = args.indexOf('--signature');
      const signature = signatureIdx > -1 ? args[signatureIdx + 1] : null;
      
      this.send(webhookUrl, JSON.parse(payload), { signature }).then(response => {
        console.log(`Status: ${response.statusCode}`);
        console.log(`Response: ${response.body.substring(0, 200)}`);
      }).catch(err => {
        console.error(`Failed: ${err.message}`);
        process.exit(1);
      });
    }

    if (command === 'test') {
      const webhookUrl = args[1];
      this.test(webhookUrl).then(success => {
        process.exit(success ? 0 : 1);
      });
    }

    if (command === 'server') {
      const portIdx = args.indexOf('--port');
      const port = portIdx > -1 ? parseInt(args[portIdx + 1]) : 3000;
      
      const server = http.createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            console.log(`Received: ${body.substring(0, 200)}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ received: true }));
          });
        } else {
          res.writeHead(200);
          res.end('Webhook Receiver Running');
        }
      });

      server.listen(port, () => {
        console.log(`Webhook receiver listening on port ${port}`);
      });
    }
  }
}

if (require.main === module) {
  const forwarder = new WebhookForwarder();
  forwarder.run();
}

module.exports = { WebhookForwarder };
