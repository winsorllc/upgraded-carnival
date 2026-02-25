/**
 * Xurl Skill - X (Twitter) API CLI wrapper
 * Makes authenticated requests to the X API
 */

const crypto = require('crypto');
const https = require('https');

class XurlClient {
  constructor(credentials = {}) {
    this.apiKey = credentials.apiKey || process.env.X_API_KEY;
    this.apiSecret = credentials.apiSecret || process.env.X_API_SECRET;
    this.accessToken = credentials.accessToken || process.env.X_ACCESS_TOKEN;
    this.accessSecret = credentials.accessSecret || process.env.X_ACCESS_SECRET;
    this.baseUrl = 'https://api.twitter.com';
  }

  /**
   * Generate OAuth 1.0a signature for X API requests
   */
  generateOAuthSignature(method, url, params) {
    const paramsString = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key] || '')}`)
      .join('&');

    const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramsString)}`;
    const signingKey = `${encodeURIComponent(this.apiSecret)}&${encodeURIComponent(this.accessSecret)}`;

    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    return signature;
  }

  /**
   * Generate OAuth authorization header
   */
  generateAuthHeader(method, url, params) {
    const oauthParams = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000),
      oauth_token: this.accessToken,
      oauth_version: '1.0'
    };

    const signature = this.generateOAuthSignature(method, url, { ...oauthParams, ...params });
    oauthParams.oauth_signature = signature;

    const authParams = Object.keys(oauthParams)
      .sort()
      .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return `OAuth ${authParams}`;
  }

  /**
   * Make a request to the X API
   */
  async request(method, endpoint, params = {}, body = null) {
    if (!this.apiKey || !this.apiSecret || !this.accessToken || !this.accessSecret) {
      throw new Error('X API credentials not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const authHeader = this.generateAuthHeader(method, url, params);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.twitter.com',
        path: endpoint + '?' + new URLSearchParams(params),
        method: method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  /**
   * Post a tweet
   */
  async tweet(text) {
    return this.request('POST', '/2/tweets', {}, { text });
  }

  /**
   * Reply to a tweet
   */
  async reply(tweetId, text) {
    return this.request('POST', '/2/tweets', {}, { 
      text,
      reply: { in_reply_to_tweet_id: tweetId }
    });
  }

  /**
   * Quote tweet
   */
  async quote(tweetId, text) {
    return this.request('POST', '/2/tweets', {}, {
      text,
      quote_tweet_id: tweetId
    });
  }

  /**
   * Search tweets
   */
  async search(query, options = {}) {
    const params = {
      query,
      max_results: options.maxResults || 10,
      'tweet.fields': 'created_at,author_id,public_metrics'
    };
    return this.request('GET', '/2/tweets/search/recent', params);
  }

  /**
   * Get user by username
   */
  async getUser(username) {
    const params = {
      username,
      'user.fields': 'created_at,description,public_metrics,verified'
    };
    return this.request('GET', `/2/users/by/username/${username}`, params);
  }

  /**
   * Get user's tweets
   */
  async getUserTweets(userId, options = {}) {
    const params = {
      'tweet.fields': 'created_at,public_metrics,text',
      max_results: options.limit || 10
    };
    return this.request('GET', `/2/users/${userId}/tweets`, params);
  }

  /**
   * Get tweet by ID
   */
  async getTweet(tweetId) {
    const params = {
      'tweet.fields': 'created_at,author_id,public_metrics,text'
    };
    return this.request('GET', `/2/tweets/${tweetId}`, params);
  }

  /**
   * Follow a user
   */
  async follow(targetUserId) {
    const me = await this.request('GET', '/2/users/me', { 'user.fields': 'id' });
    return this.request('POST', `/2/users/${me.data.id}/following`, {}, {
      target_user_id: targetUserId
    });
  }

  /**
   * Unfollow a user
   */
  async unfollow(targetUserId) {
    const me = await this.request('GET', '/2/users/me', { 'user.fields': 'id' });
    return this.request('DELETE', `/2/users/${me.data.id}/following/${targetUserId}`);
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId, options = {}) {
    const params = {
      max_results: options.limit || 10,
      'user.fields': 'created_at,description,public_metrics'
    };
    return this.request('GET', `/2/users/${userId}/followers`, params);
  }

  /**
   * Get users that a user follows
   */
  async getFollowing(userId, options = {}) {
    const params = {
      max_results: options.limit || 10,
      'user.fields': 'created_at,description,public_metrics'
    };
    return this.request('GET', `/2/users/${userId}/following`, params);
  }

  /**
   * Send a DM
   */
  async dm(userId, text) {
    return this.request('POST', '/2/dm_events', {}, {
      event_type: 'MessageCreate',
      data: {
        conversation_id: userId,
        text
      }
    });
  }
}

module.exports = XurlClient;
