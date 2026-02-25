/**
 * Session Logs Skill
 * Search and analyze conversation history stored in session JSONL files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGS_DIR = path.join(process.env.WORKDIR || '/job', 'logs');

/**
 * Search all sessions for a keyword
 * @param {string} keyword - The keyword to search for
 * @param {number} limit - Maximum number of results
 * @returns {Array} Matching sessions with context
 */
function searchSessions(keyword, limit = 10) {
  const results = [];
  
  if (!fs.existsSync(LOGS_DIR)) {
    return { error: 'Logs directory not found', results: [] };
  }

  const sessions = fs.readdirSync(LOGS_DIR)
    .filter(item => {
      const sessionPath = path.join(LOGS_DIR, item, 'session.jsonl');
      return fs.existsSync(sessionPath);
    });

  for (const sessionId of sessions) {
    const sessionPath = path.join(LOGS_DIR, sessionId, 'session.jsonl');
    try {
      const content = fs.readFileSync(sessionPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          const content = msg.content || '';
          if (content.toLowerCase().includes(keyword.toLowerCase())) {
            results.push({
              session: sessionId,
              role: msg.role,
              content: content.substring(0, 200),
              timestamp: msg.timestamp || null
            });
            
            if (results.length >= limit) {
              return results;
            }
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    } catch (e) {
      console.error(`Error reading session ${sessionId}:`, e.message);
    }
  }

  return results;
}

/**
 * Get messages from a specific session
 * @param {string} jobId - The job/session ID
 * @param {string|null} role - Filter by role (user, assistant, tool)
 * @returns {Array} Messages from the session
 */
function getSessionMessages(jobId, role = null) {
  const sessionPath = path.join(LOGS_DIR, jobId, 'session.jsonl');
  
  if (!fs.existsSync(sessionPath)) {
    return { error: `Session not found: ${jobId}`, messages: [] };
  }

  try {
    const content = fs.readFileSync(sessionPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const messages = [];

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (!role || msg.role === role) {
          messages.push(msg);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    return messages;
  } catch (e) {
    return { error: `Error reading session: ${e.message}`, messages: [] };
  }
}

/**
 * Summarize a session
 * @param {string} jobId - The job/session ID
 * @returns {Object} Session summary
 */
function summarizeSession(jobId) {
  const messages = getSessionMessages(jobId);
  
  if (messages.error) {
    return messages;
  }

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const toolMessages = messages.filter(m => m.tool_call_id !== undefined);

  // Extract topics from first user message (usually the task)
  const firstUserMsg = userMessages[0]?.content || 'Unknown task';
  
  // Find tool usage
  const toolUsage = {};
  toolMessages.forEach(msg => {
    const toolName = msg.name || 'unknown';
    toolUsage[toolName] = (toolUsage[toolName] || 0) + 1;
  });

  return {
    jobId,
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    toolCalls: toolMessages.length,
    toolUsage,
    taskPreview: firstUserMsg.substring(0, 100),
    firstTimestamp: messages[0]?.timestamp,
    lastTimestamp: messages[messages.length - 1]?.timestamp
  };
}

/**
 * Get all sessions with metadata
 * @returns {Array} List of sessions with basic info
 */
function listSessions() {
  if (!fs.existsSync(LOGS_DIR)) {
    return [];
  }

  return fs.readdirSync(LOGS_DIR)
    .map(sessionId => {
      const sessionPath = path.join(LOGS_DIR, sessionId, 'session.jsonl');
      if (!fs.existsSync(sessionPath)) return null;
      
      const stats = fs.statSync(sessionPath);
      const content = fs.readFileSync(sessionPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return {
        jobId: sessionId,
        size: stats.size,
        messageCount: lines.length,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    })
    .filter(s => s !== null)
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
}

module.exports = {
  searchSessions,
  getSessionMessages,
  summarizeSession,
  listSessions
};
