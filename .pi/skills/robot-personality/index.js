/**
 * Robot Personality Skill
 * Loads SOUL.md style personality files with safety constraints
 */

import { loadPersonality, parsePersonality, getCurrentPersonality } from './lib/personality.js';
import { SafetyEngine } from './lib/safety.js';
import { MemoryStore } from './lib/memory.js';
import { StateMachine } from './lib/state.js';
import fs from 'fs/promises';
import path from 'path';

class RobotPersonalitySkill {
  constructor() {
    this.safety = new SafetyEngine();
    this.memory = new MemoryStore();
    this.state = new StateMachine();
    this.currentPersonality = null;
    this.personalitiesDir = './personalities';
  }

  /**
   * Load a personality file
   */
  async loadPersonality({ name, strictness = 'normal', persist = true }) {
    try {
      const personalityPath = path.resolve(this.personalitiesDir, `${name}.md`);
      const content = await fs.readFile(personalityPath, 'utf-8');
      
      const personality = parsePersonality(content);
      this.currentPersonality = {
        ...personality,
        name,
        strictness,
        loadedAt: new Date().toISOString()
      };

      // Initialize safety rules with strictness level
      this.safety.loadRules(personality.safetyRules, strictness);
      
      // Set initial state
      await this.state.transition('idle', `Loaded personality: ${name}`);

      if (persist) {
        await this.memory.store('last_personality', {
          name,
          strictness,
          loadedAt: this.currentPersonality.loadedAt
        });
      }

      return {
        success: true,
        personality: this.currentPersonality,
        safetyRules: this.safety.getActiveRules()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current personality info
   */
  getCurrentPersonality() {
    return {
      active: this.currentPersonality,
      state: this.state.current,
      safetyStats: this.safety.getStats()
    };
  }

  /**
   * Check if an action is safe
   */
  async safetyCheck({ action, target, context = {}, confirmed = false }) {
    const result = await this.safety.evaluate({ action, target, context, confirmed });
    
    if (!result.approved && result.severity === 'CRITICAL') {
      await this.state.transition('concerned', `Critical safety violation: ${result.reason}`);
    }

    return result;
  }

  /**
   * Get behavior guidance for a situation
   */
  async getBehavior({ situation, context = {}, severity = 'normal' }) {
    if (!this.currentPersonality) {
      return { tone: 'neutral', approach: 'standard', rules: [] };
    }

    const behaviors = this.currentPersonality.behaviors || {};
    const emergency = this.currentPersonality.emergencyResponses || {};
    
    // Check for emergency response first
    if (severity === 'high' && emergency[situation]) {
      return {
        tone: 'calm',
        approach: 'emergency',
        response: emergency[situation],
        emergency: true
      };
    }

    // Look up behavior for situation
    const behavior = behaviors[situation] || behaviors.default || {
      tone: this.currentPersonality.voice?.tone || 'neutral',
      approach: 'standard'
    };

    return {
      ...behavior,
      personality: this.currentPersonality.name,
      state: this.state.current.state
    };
  }

  /**
   * Store or retrieve memory
   */
  async memoryAction({ action, key, value, pattern }) {
    switch (action) {
      case 'store':
        return await this.memory.store(key, value);
      case 'recall':
        return await this.memory.recall(key);
      case 'query':
        return await this.memory.query(pattern);
      case 'clear':
        return await this.memory.clear(key);
      default:
        throw new Error(`Unknown memory action: ${action}`);
    }
  }

  /**
   * Manage state machine
   */
  async stateAction({ action, to, reason }) {
    switch (action) {
      case 'current':
        return this.state.current;
      case 'transition':
        return await this.state.transition(to, reason);
      case 'history':
        return this.state.getHistory();
      default:
        throw new Error(`Unknown state action: ${action}`);
    }
  }
}

// Export singleton instance
const skill = new RobotPersonalitySkill();

// Tool functions that match the SKILL.md specification
export const robot_load_personality = (params) => skill.loadPersonality(params);
export const robot_safety_check = (params) => skill.safetyCheck(params);
export const robot_behavior = (params) => skill.getBehavior(params);
export const robot_memory = (params) => skill.memoryAction(params);
export const robot_state = (params) => skill.stateAction(params);

// Backward compatibility
export const tools = {
  robot_load_personality,
  robot_safety_check,
  robot_behavior,
  robot_memory,
  robot_state
};

export default skill;
