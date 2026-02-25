/**
 * State Machine for Robot Personality
 * Manages behavioral state transitions
 */

export class StateMachine {
  constructor() {
    this.states = {
      idle: { 
        description: 'Waiting for input',
        allowedTransitions: ['listening', 'focused_work', 'explaining']
      },
      listening: {
        description: 'Actively listening to user',
        allowedTransitions: ['thinking', 'working', 'explaining', 'concerned', 'idle']
      },
      thinking: {
        description: 'Processing information',
        allowedTransitions: ['working', 'explaining', 'concerned', 'listening']
      },
      working: {
        description: 'Executing tasks',
        allowedTransitions: ['explaining', 'listening', 'concerned', 'emergency', 'idle']
      },
      explaining: {
        description: 'Communicating results',
        allowedTransitions: ['listening', 'idle', 'working']
      },
      concerned: {
        description: 'Safety concern detected',
        allowedTransitions: ['emergency', 'listening', 'idle']
      },
      emergency: {
        description: 'Emergency stop active',
        allowedTransitions: ['idle', 'listening']
      }
    };
    
    this.current = {
      state: 'idle',
      since: new Date().toISOString(),
      reason: 'Initialized'
    };
    
    this.history = [];
  }

  /**
   * Transition to a new state
   */
  async transition(toState, reason = '') {
    const target = toState.toLowerCase().replace(/\s+/g, '_');
    
    // Validate state exists
    if (!this.states[target]) {
      return {
        success: false,
        error: `Unknown state: ${toState}`,
        current: this.current
      };
    }
    
    // Check if transition is allowed
    const currentState = this.states[this.current.state];
    if (!currentState.allowedTransitions.includes(target)) {
      return {
        success: false,
        error: `Cannot transition from ${this.current.state} to ${target}`,
        allowed: currentState.allowedTransitions,
        current: this.current
      };
    }
    
    // Record transition
    this.history.push({
      ...this.current,
      duration: Date.now() - new Date(this.current.since).getTime()
    });
    
    // Keep history manageable
    if (this.history.length > 100) {
      this.history.shift();
    }
    
    // Make transition
    const previousState = this.current.state;
    this.current = {
      state: target,
      since: new Date().toISOString(),
      reason: reason || `Transition from ${previousState}`,
      previous: previousState
    };
    
    return {
      success: true,
      previous: previousState,
      current: this.current
    };
  }

  /**
   * Get current state
   */
  get current() {
    return this._current;
  }

  /**
   * Set current state
   */
  set current(value) {
    this._current = value;
  }

  /**
   * Get state history
   */
  getHistory() {
    return {
      current: this.current,
      previous: this.history.slice(-10)
    };
  }

  /**
   * Check if can transition to state
   */
  canTransition(toState) {
    const target = toState.toLowerCase().replace(/\s+/g, '_');
    const currentState = this.states[this.current.state];
    return {
      possible: currentState.allowedTransitions.includes(target),
      from: this.current.state,
      to: target,
      allowed: currentState.allowedTransitions
    };
  }

  /**
   * Get state description
   */
  getStateDescription(state) {
    const s = state.toLowerCase().replace(/\s+/g, '_');
    return this.states[s]?.description || 'Unknown state';
  }

  /**
   * Force state (for testing/emergency)
   */
  forceState(state, reason = 'Forced') {
    const target = state.toLowerCase().replace(/\s+/g, '_');
    this.current = {
      state: target,
      since: new Date().toISOString(),
      reason
    };
    return this.current;
  }
}
