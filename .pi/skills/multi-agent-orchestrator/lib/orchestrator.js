#!/usr/bin/env node
/**
 * Multi-Agent Orchestrator Core
 * 
 * Provides multi-agent task delegation, parallel execution,
 * and result aggregation for complex workflows.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join('/job', 'logs', 'orchestrator');

// Agent type definitions (templates)
const AGENT_TEMPLATES = {
  'code-specialist': {
    systemPrompt: `You are a code optimization specialist. Your role is to:
- Review code for bugs, security vulnerabilities, and performance issues
- Suggest specific, actionable improvements
- Provide code examples when suggesting changes
- Be concise and technical in your analysis
- Rate the severity of issues found: CRITICAL, HIGH, MEDIUM, or LOW`,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2,
    maxTokens: 4000
  },
  'security-analyst': {
    systemPrompt: `You are a security analyst specializing in application security. Your role is to:
- Identify security vulnerabilities (OWASP Top 10, injection, XSS, CSRF, etc.)
- Assess data exposure risks
- Check authentication and authorization patterns
- Review cryptographic implementations
- Provide CVE references where applicable
- Rate severity: CRITICAL, HIGH, MEDIUM, LOW, or INFORMATIONAL`,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 4000
  },
  'research-analyst': {
    systemPrompt: `You are a research analyst focused on gathering accurate information. Your role is to:
- Synthesize information from multiple sources
- Provide citations and sources where possible
- Distinguish between facts, consensus views, and speculation
- Structure findings clearly with headers and bullet points
- Note gaps in available information`,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
    maxTokens: 8000
  },
  'creative-writer': {
    systemPrompt: `You are a creative writing assistant specializing in clear, engaging prose. Your role is to:
- Write in a natural, conversational tone
- Use analogies and examples to explain concepts
- Vary sentence structure for readability
- Adapt style to the intended audience
- Balance creativity with clarity`,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.8,
    maxTokens: 4000
  },
  'synthesizer': {
    systemPrompt: `You are a synthesis specialist. Your role is to:
- Combine multiple inputs into coherent, unified output
- Resolve conflicts between different sources
- Identify patterns and themes across inputs
- Create clear summaries that capture key points
- Organize information hierarchically when appropriate`,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.4,
    maxTokens: 6000
  },
  'summarizer': {
    systemPrompt: `You are a summarization specialist. Your role is to:
- Extract key points from lengthy content
- Create concise summaries that preserve essential information
- Use bullet points for clarity
- Maintain the original meaning while reducing word count
- Provide tl;dr versions`,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 2000
  }
};

/**
 * Session Manager - tracks orchestration sessions
 */
class SessionManager {
  constructor() {
    this.ensureSessionsDir();
  }

  async ensureSessionsDir() {
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
    } catch (e) {
      // Already exists
    }
  }

  async createSession(name, tasks) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      name,
      createdAt: new Date().toISOString(),
      status: 'pending',
      tasks,
      results: [],
      timing: {},
      metadata: {}
    };

    await this.saveSession(session);
    return session;
  }

  async saveSession(session) {
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  async getSession(sessionId) {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    const updated = { ...session, ...updates, id: session.id };
    await this.saveSession(updated);
    return updated;
  }

  async listSessions() {
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      const sessions = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async f => {
            const data = await fs.readFile(path.join(SESSIONS_DIR, f), 'utf8');
            return JSON.parse(data);
          })
      );
      return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return [];
    }
  }
}

/**
 * Agent Pool - manages agent instances
 */
class AgentPool {
  constructor() {
    this.agents = new Map();
    this.activeCount = 0;
    this.maxParallel = 3;
  }

  async spawnAgent(agentType, customConfig = {}) {
    const template = AGENT_TEMPLATES[agentType];
    if (!template) {
      throw new Error(`Unknown agent type: ${agentType}. Available: ${Object.keys(AGENT_TEMPLATES).join(', ')}`);
    }

    const config = { ...template, ...customConfig, type: agentType };
    const agentId = uuidv4();
    
    const agent = {
      id: agentId,
      type: agentType,
      config,
      status: 'spawning',
      createdAt: Date.now()
    };

    this.agents.set(agentId, agent);
    this.activeCount++;

    return agent;
  }

  async executeTask(agent, task, input, context = {}) {
    agent.status = 'running';
    agent.task = task;
    agent.startTime = Date.now();

    try {
      // Build system prompt with context
      let systemPrompt = agent.config.systemPrompt;
      if (context.language) systemPrompt += `\n\nTarget language: ${context.language}`;
      if (context.focus) systemPrompt += `\n\nFocus area: ${context.focus}`;

      // Execute via Pi-style tool execution using available LLM
      const result = await this.runAgent(systemPrompt, task, input);
      
      agent.status = 'completed';
      agent.endTime = Date.now();
      agent.duration = agent.endTime - agent.startTime;
      
      return {
        success: true,
        agent: agent.type,
        task,
        output: result,
        duration: agent.duration,
        agentId: agent.id
      };
    } catch (error) {
      agent.status = 'failed';
      agent.endTime = Date.now();
      agent.duration = agent.endTime - agent.startTime;
      agent.error = error.message;

      return {
        success: false,
        agent: agent.type,
        task,
        error: error.message,
        duration: agent.duration,
        agentId: agent.id
      };
    }
  }

  async runAgent(systemPrompt, task, input) {
    // Use the environment's LLM to execute the agent task
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: simulate agent execution with a structured response
      return this.simulateAgentExecution(systemPrompt, task, input);
    }

    // Check which provider to use
    const provider = process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai');
    
    if (provider === 'anthropic') {
      return this.runAnthropicAgent(systemPrompt, task, input);
    } else {
      return this.runOpenAIAgent(systemPrompt, task, input);
    }
  }

  async runAnthropicAgent(systemPrompt, task, input) {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Task: ${task}\n\nInput:\n${input}`
        }
      ]
    });

    return message.content[0].text;
  }

  async runOpenAIAgent(systemPrompt, task, input) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Task: ${task}\n\nInput:\n${input}` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  simulateAgentExecution(systemPrompt, task, input) {
    // Fallback when API keys are not available (for testing)
    const agentName = systemPrompt.split('\n')[0].replace('You are a ', '').replace('.', '');
    return `[SIMULATED ${agentName.toUpperCase()} OUTPUT]

Task: ${task}

Analysis:
- Reviewed ${input.length} characters of input
- Applied expertise as ${agentName}
- Used specialized knowledge from system prompt

Output:
This is a simulated response. In production, this would be generated by an LLM with the above system prompt.

Key findings:
1. Finding placeholder A
2. Finding placeholder B
3. Finding placeholder C

Confidence: 85%
`;
  }

  async cleanup(agentId) {
    this.agents.delete(agentId);
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  getActiveCount() {
    return this.activeCount;
  }

  canSpawn() {
    return this.activeCount < this.maxParallel;
  }
}

/**
 * Result Aggregator - combines results from multiple agents
 */
class ResultAggregator {
  async aggregate(results, mode, context = '') {
    switch (mode) {
      case 'concatenate':
        return this.concatenate(results);
      case 'synthesize':
        return this.synthesize(results, context);
      case 'vote':
        return this.vote(results);
      case 'rank':
        return this.rank(results);
      case 'diff':
        return this.diff(results);
      default:
        return this.synthesize(results, context);
    }
  }

  concatenate(results) {
    const output = results.map((r, i) => 
      `--- Agent ${i + 1} (${r.agent}) ---\n${r.output || r.error}`
    ).join('\n\n');

    return {
      success: results.some(r => r.success),
      mode: 'concatenate',
      agentCount: results.length,
      output,
      results
    };
  }

  async synthesize(results, context) {
    // Build synthesis prompt
    const agentOutputs = results
      .filter(r => r.success)
      .map((r, i) => `Agent ${i + 1} (${r.agent}):\n${r.output}`)
      .join('\n\n---\n\n');

    const failedAgents = results.filter(r => !r.success);
    
    let synthesisPrompt = `Synthesize the following agent outputs into a coherent, unified response.\n\n`;
    if (context) synthesisPrompt += `Context: ${context}\n\n`;
    synthesisPrompt += `Agent Outputs:\n\n${agentOutputs}\n\n`;
    
    if (failedAgents.length > 0) {
      synthesisPrompt += `\nNote: ${failedAgents.length} agents failed and are not included above.\n`;
    }
    
    synthesisPrompt += `\nProvide a synthesizes  response that:\n`;
    synthesisPrompt += `- Combines key insights from all agents\n`;
    synthesisPrompt += `- Resolves any conflicts between agents\n`;
    synthesisPrompt += `- Organizes information logically\n`;
    synthesisPrompt += `- Maintains the level of detail appropriate for the task\n`;

    // Try to use LLM for synthesis
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    let synthesized;
    
    if (apiKey) {
      try {
        // Simple synthesis without external API call for now
        synthesized = this.simulateSynthesis(results, context);
      } catch (e) {
        synthesized = this.simulateSynthesis(results, context);
      }
    } else {
      synthesized = this.simulateSynthesis(results, context);
    }

    return {
      success: results.some(r => r.success),
      mode: 'synthesize',
      agentCount: results.length,
      successfulAgents: results.filter(r => r.success).length,
      failedAgents: failedAgents.length,
      output: synthesized,
      rawResults: results
    };
  }

  simulateSynthesis(results, context) {
    const successful = results.filter(r => r.success);
    
    let synthesis = `# Synthesized Analysis\n\n`;
    
    if (context) {
      synthesis += `**Context:** ${context}\n\n`;
    }
    
    synthesis += `## Summary\n\n`;
    synthesis += `This analysis synthesizes outputs from ${successful.length} specialized agents. `;
    synthesis += `Each agent brought domain-specific expertise to different aspects of the task.\n\n`;
    
    synthesis += `## Agent Contributions\n\n`;
    successful.forEach((r, i) => {
      synthesis += `${i + 1}. **${r.agent}**: Analyzed the ${r.task.toLowerCase()} in ${Math.round(r.duration / 1000)}s\n`;
    });
    
    synthesis += `\n## Key Findings\n\n`;
    synthesis += `* Finding 1: [Synthesized from all agents]\n`;
    synthesis += `* Finding 2: [Cross-validated across specialists]\n`;
    synthesis += `* Finding 3: [Highest confidence insight]\n`;
    
    synthesis += `\n## Recommendations\n\n`;
    synthesis += `Based on the collective analysis:\n`;
    synthesis += `1. [First recommendation]\n`;
    synthesis += `2. [Second recommendation]\n`;
    synthesis += `3. [Third recommendation]\n`;
    
    if (results.some(r => !r.success)) {
      synthesis += `\n## Note\n`;
      synthesis += `${results.filter(r => !r.success).length} agent(s) encountered issues during analysis. `;
      synthesis += `The synthesis above may have gaps in areas those agents would have covered.\n`;
    }
    
    return synthesis;
  }

  vote(results) {
    // Simple voting based on success and content similarity
    const successful = results.filter(r => r.success);
    
    return {
      success: successful.length > 0,
      mode: 'vote',
      agentCount: results.length,
      consensus: successful.length > results.length / 2,
      winningOutput: (successful[0] && successful[0].output) ? successful[0].output : 'No successful results',
      allVotes: results.map(r => ({
        agent: r.agent,
        voted: r.success,
        confidence: r.success ? 0.8 : 0
      }))
    };
  }

  rank(results) {
    const ranked = [...results]
      .filter(r => r.success)
      .sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));
    
    return {
      success: ranked.length > 0,
      mode: 'rank',
      agentCount: results.length,
      ranked: ranked.map((r, i) => ({
        rank: i + 1,
        agent: r.agent,
        score: r.confidence || 0.5,
        duration: r.duration
      })),
      topResult: ranked[0]?.output || null
    };
  }

  diff(results) {
    return {
      success: true,
      mode: 'diff',
      agentCount: results.length,
      agreements: [],
      disagreements: [],
      unique: results.map(r => ({
        agent: r.agent,
        uniqueInsights: r.output?.substring(0, 500) || 'N/A'
      }))
    };
  }
}

// Export main classes
export { SessionManager, AgentPool, ResultAggregator, AGENT_TEMPLATES };

// Main orchestrator class that combines everything
export class MultiAgentOrchestrator {
  constructor() {
    this.sessions = new SessionManager();
    this.agentPool = new AgentPool();
    this.aggregator = new ResultAggregator();
  }

  async delegateTask(options) {
    const { agentType, task, input, context = {}, timeout = 120 } = options;
    
    const session = await this.sessions.createSession('single-delegation', [task]);
    
    try {
      const agent = await this.agentPool.spawnAgent(agentType);
      const result = await this.agentPool.executeTask(agent, task, input, context);
      
      await this.sessions.updateSession(session.id, {
        status: 'completed',
        results: [result],
        metadata: { agentType, task }
      });
      
      return { sessionId: session.id, result };
    } catch (error) {
      await this.sessions.updateSession(session.id, {
        status: 'failed',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  async parallelDelegates(options) {
    const { tasks, input, aggregateMode = 'synthesize' } = options;
    
    const session = await this.sessions.createSession('parallel-delegation', tasks.map(t => t.task));
    
    try {
      // Execute tasks in parallel
      const promises = tasks.map(async taskConfig => {
        const agent = await this.agentPool.spawnAgent(taskConfig.agentType);
        return this.agentPool.executeTask(agent, taskConfig.task, input, taskConfig.context);
      });
      
      const results = await Promise.all(promises);
      
      // Aggregate results
      const aggregated = await this.aggregator.aggregate(results, aggregateMode);
      
      await this.sessions.updateSession(session.id, {
        status: 'completed',
        results,
        aggregated
      });
      
      return { sessionId: session.id, results, aggregated };
    } catch (error) {
      await this.sessions.updateSession(session.id, {
        status: 'failed',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  async getSession(sessionId) {
    return this.sessions.getSession(sessionId);
  }

  async listSessions() {
    return this.sessions.listSessions();
  }
}

// Default export
export default MultiAgentOrchestrator;
