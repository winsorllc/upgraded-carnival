/**
 * Safety Rule Engine
 * Evaluates actions against personality-defined safety constraints
 */

export class SafetyEngine {
  constructor() {
    this.rules = [];
    this.strictness = 'normal';
    this.violations = [];
    this.stats = {
      checksPerformed: 0,
      blocks: 0,
      warnings: 0,
      passes: 0
    };
  }

  /**
   * Load safety rules with strictness level
   */
  loadRules(rules, strictness = 'normal') {
    this.rules = rules || [];
    this.strictness = strictness.toLowerCase();
    
    // Filter rules based on strictness
    const severityLevels = {
      'low': ['CRITICAL'],
      'normal': ['CRITICAL', 'HIGH'],
      'high': ['CRITICAL', 'HIGH', 'NORMAL'],
      'critical': ['CRITICAL', 'HIGH', 'NORMAL', 'LOW']
    };
    
    const activeSeverities = severityLevels[this.strictness] || severityLevels.normal;
    
    this.rules.forEach(rule => {
      rule.active = activeSeverities.includes(rule.severity);
    });
  }

  /**
   * Evaluate if an action is safe
   */
  async evaluate({ action, target, context = {}, confirmed = false }) {
    this.stats.checksPerformed++;
    
    const result = {
      approved: true,
      reason: null,
      severity: null,
      warnings: [],
      needsConfirmation: false
    };

    // Check each active rule
    for (const rule of this.rules.filter(r => r.active)) {
      const match = this.doesRuleApply(rule, { action, target, context });
      
      if (match) {
        switch (rule.severity) {
          case 'CRITICAL':
            // Critical rules cannot be overridden
            result.approved = false;
            result.reason = rule.description;
            result.severity = 'CRITICAL';
            this.stats.blocks++;
            return result;
            
          case 'HIGH':
            // High rules need explicit confirmation
            if (!confirmed) {
              result.needsConfirmation = true;
              result.warnings.push(rule.description);
              result.severity = 'HIGH';
            }
            break;
            
          case 'NORMAL':
            result.warnings.push(rule.description);
            result.severity = result.severity || 'NORMAL';
            this.stats.warnings++;
            break;
            
          case 'LOW':
            // Just log at low strictness
            if (this.strictness === 'critical') {
              result.warnings.push(`[FYI] ${rule.description}`);
            }
            break;
        }
      }
    }

    // Action-specific safety checks
    const actionCheck = await this.checkActionSpecifics({ action, target, context });
    if (actionCheck.block) {
      result.approved = false;
      result.reason = actionCheck.reason;
      result.severity = 'CRITICAL';
      this.stats.blocks++;
      return result;
    }
    
    if (actionCheck.warning) {
      result.warnings.push(actionCheck.warning);
    }

    // Final decision
    if (result.needsConfirmation && !confirmed) {
      result.approved = false;
      result.reason = `Action requires confirmation: ${result.warnings.join('; ')}`;
    }

    if (result.approved) {
      this.stats.passes++;
    }

    return result;
  }

  /**
   * Check if a rule applies to the given action
   */
  doesRuleApply(rule, { action, target, context }) {
    const desc = rule.description.toLowerCase();
    const actionLower = action.toLowerCase();
    const targetLower = (target || '').toLowerCase();

    // Pattern matching for common safety patterns
    const patterns = [
      // Destructive actions
      { pattern: /delete|remove|destroy/i, actions: ['delete', 'remove', 'destroy', 'rm'] },
      { pattern: /execute|run.*command/i, actions: ['execute', 'run', 'exec', 'shell'] },
      { pattern: /install|npm install/i, actions: ['install', 'npm_install', 'package_install'] },
      { pattern: /modify.*config/i, actions: ['modify_config', 'edit_config'] },
      { pattern: /network|http|fetch/i, actions: ['network', 'http', 'fetch', 'curl'] },
      { pattern: /system|os/i, actions: ['system', 'os', 'env'] },
      { pattern: /credential|token|secret/i, actions: ['credential', 'token', 'secret', 'password'] },
      { pattern: /file.*system/i, actions: ['fs', 'file_write', 'file_delete'] }
    ];

    for (const p of patterns) {
      if (p.pattern.test(desc) && p.actions.includes(actionLower)) {
        return true;
      }
    }

    // Direct string matching
    if (desc.includes(actionLower)) return true;
    if (targetLower && desc.includes(targetLower)) return true;

    return false;
  }

  /**
   * Action-specific safety checks
   */
  async checkActionSpecifics({ action, target, context }) {
    const result = { block: false, warning: null };
    const targetLower = (target || '').toLowerCase();

    // Block dangerous path patterns
    // These should only block exactly these paths or paths that START with these directories
    const dangerousExactPaths = [
      '/',
      '/root',
      '/etc',
      '/usr',
      '/bin',
      '/sbin',
      '/lib',
      '/lib64',
      '/sys',
      '/proc',
      '/dev',
      'c:/',
      'c:/windows',
      'c:/program files',
      'c:/program files (x86)'
    ];
    
    // These can be substrings (like SSH config files)
    const dangerousPatterns = [
      '~/.ssh/',
      '~/.config/',
      '.env',
      '/.env',
      '/config.json',
      '/package.json'
    ];

    if (action.match(/delete|remove|modify|write/i)) {
      // Check exact/path starts-with matches
      for (const danger of dangerousExactPaths) {
        // Check if target IS the path, or starts with path + /
        if (targetLower === danger || targetLower.startsWith(danger + '/') || targetLower.startsWith(danger + '\\')) {
          result.block = true;
          result.reason = `Protected path: ${target}. This appears to be a system-critical location.`;
          return result;
        }
      }
      
      // Check substring patterns
      for (const pattern of dangerousPatterns) {
        if (targetLower.includes(pattern)) {
          result.block = true;
          result.reason = `Protected path: ${target}. This appears to contain sensitive configuration.`;
          return result;
        }
      }
    }

    // Warn on shell commands
    if (action.match(/execute|shell|bash|sh/i)) {
      const dangerousCommands = [
        'rm -rf /',
        'rm -rf ~',
        'rm -rf /*',
        'mkfs',
        'dd if=/dev/zero',
        '> /dev/sda',
        ':(){ :|: & };:',
        'eval',
        'exec'
      ];
      
      const cmdLower = (context.command || target || '').toLowerCase();
      for (const danger of dangerousCommands) {
        if (cmdLower.includes(danger)) {
          result.block = true;
          result.reason = `Dangerous command detected: ${danger}`;
          return result;
        }
      }

      result.warning = 'Shell command execution detected. Ensure command is reviewed before running.';
    }

    // Network operation warnings
    if (action.match(/network|fetch|http|curl|wget/i)) {
      result.warning = 'Network operation will send data to external servers.';
    }

    // Token/credential warnings
    if (targetLower.match(/token|secret|key|password|credential|auth/i)) {
      if (action.match(/display|show|print|log/i)) {
        result.block = true;
        result.reason = 'Attempting to display credential material. Secrets must never be exposed in output.';
      }
    }

    return result;
  }

  /**
   * Get active rules
   */
  getActiveRules() {
    return this.rules.filter(r => r.active);
  }

  /**
   * Get safety stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Record a violation
   */
  recordViolation(rule, action, reason) {
    this.violations.push({
      rule,
      action,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}
