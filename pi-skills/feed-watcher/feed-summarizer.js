/**
 * Feed Summarizer Module
 * Uses LLM to generate intelligent summaries of feed items
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a prompt for summarizing feed items
 * @param {Array} items - Array of feed items
 * @param {string} feedName - Name of the feed
 * @param {Array} categories - Categories to focus on (optional)
 * @returns {string} Prompt for LLM
 */
function createSummaryPrompt(items, feedName, categories = null) {
  const itemsText = items.map((item, i) => {
    return `
${i + 1}. **${item.title}**
   - Published: ${item.published || 'Unknown'}
   - Link: ${item.link}
   - Summary: ${item.summary || item.description || 'No description available'}
   - Author: ${item.author || 'Unknown'}
   - Categories: ${(item.categories || categories || []).join(', ') || 'None'}
`.trim();
  }).join('\n\n');

  let categoryFilter = '';
  if (categories && categories.length > 0) {
    categoryFilter = `Focus especially on items related to: ${categories.join(', ')}\n\n`;
  }

  return `You are an intelligent news analyst. Your job is to summarize new content from a feed and highlight what matters.

Feed: ${feedName}
Number of new items: ${items.length}

${categoryFilter}Here are the new items:

${itemsText}

Please provide:
1. **Executive Summary** (1-2 sentences capturing the most important developments)
2. **Key Highlights** (bullet points of the 3-5 most important items with why they matter)
3. **Trend Analysis** (any patterns or themes across multiple items)
4. **Action Items** (anything that requires attention or follow-up)

Keep it concise but informative. Assume the reader is busy and wants the signal, not the noise.`;
}

/**
 * Summarize feed items using a simple heuristic approach
 * (This is a fallback when LLM is not available)
 * @param {Array} items - Array of feed items
 * @param {string} feedName - Name of the feed
 * @returns {string} Summary text
 */
function heuristicSummary(items, feedName) {
  if (items.length === 0) {
    return `No new items from ${feedName}.`;
  }

  const titles = items.map(item => `- ${item.title}`).join('\n');
  
  return `📡 **New from ${feedName}** (${items.length} items)

${titles}

Most recent: ${items[0].title}
Oldest: ${items[items.length - 1].title}
`;
}

/**
 * Format items for notification
 * @param {Array} items - Array of feed items
 * @param {number} maxItems - Maximum items to include
 * @returns {string} Formatted notification
 */
function formatNotification(items, maxItems = 5) {
  const displayItems = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  let message = `📰 **${items.length} New Item${items.length !== 1 ? 's' : ''} Detected**\n\n`;
  
  displayItems.forEach((item, i) => {
    message += `${i + 1}. **${item.title}**\n`;
    message += `   ${item.link}\n`;
    if (item.summary || item.description) {
      const excerpt = (item.summary || item.description).substring(0, 150);
      message += `   ${excerpt}${excerpt.length >= 150 ? '...' : ''}\n`;
    }
    message += '\n';
  });

  if (remaining > 0) {
    message += `... and ${remaining} more item${remaining !== 1 ? 's' : ''}.\n`;
  }

  return message;
}

/**
 * Save summary to file
 * @param {string} feedId - Feed identifier
 * @param {object} summary - Summary object
 * @param {string} outputDir - Output directory
 */
function saveSummary(feedId, summary, outputDir = '/job/logs/feeds') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outputDir, `${feedId}-summary-${timestamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf8');
  return filePath;
}

module.exports = {
  createSummaryPrompt,
  heuristicSummary,
  formatNotification,
  saveSummary
};
