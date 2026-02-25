/**
 * Slack Notify Skill
 * Send messages to Slack via incoming webhooks
 */

const axios = require('axios');

/**
 * Send a message to Slack via webhook
 * @param {string} text - Message text
 * @param {object} options - Additional options (blocks, attachments, thread_ts, etc.)
 * @returns {Promise<object>} Result object
 */
async function sendSlackMessage(text, options = {}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL environment variable not set');
  }

  const payload = {
    text: text || '',
    ...options
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    // Slack returns "ok" for success
    if (response.data !== 'ok') {
      throw new Error(`Slack API error: ${response.data}`);
    }

    return { success: true };
  } catch (error) {
    if (error.response) {
      throw new Error(`Slack API error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

module.exports = { sendSlackMessage };
