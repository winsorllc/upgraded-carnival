/**
 * Discord Notify Skill
 * Send messages to Discord via webhooks
 */

const axios = require('axios');

/**
 * Send a message to Discord via webhook
 * @param {string} content - Message content
 * @param {object} options - Additional options (embeds, username, avatar_url, etc.)
 * @returns {Promise<object>} Discord API response
 */
async function sendDiscordMessage(content, options = {}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL environment variable not set');
  }

  const payload = {
    content: content || '',
    ...options
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
      validateStatus: status => status < 500
    });

    if (response.status >= 400) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    return { success: true, status: response.status };
  } catch (error) {
    if (error.response) {
      throw new Error(`Discord API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

module.exports = { sendDiscordMessage };
