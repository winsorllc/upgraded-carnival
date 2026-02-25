#!/usr/bin/env node
/**
 * Chat Command Processor
 * Terminal chat-style command processing
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

class ChatCommandProcessor {
  constructor() {
    this.commands = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    // /status - System status
    this.register('status', {
      description: 'Show system status',
      usage: '/status',
      execute: () => {
        const now = new Date().toISOString();
        return {
          text: `${colors.green}● System Status${colors.reset}
${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
Time: ${now}
Status: ${colors.green}Operational${colors.reset}
Commands: ${this.commands.size} available
Use /help for command list`,
        };
      },
    });

    // /help - Help menu
    this.register('help', {
      description: 'Show help menu',
      usage: '/help [command]',
      execute: (args) => {
        if (args.length > 0) {
          const cmd = args[0].replace(/^\//, '');
          const cmdInfo = this.commands.get(cmd);
          if (cmdInfo) {
            return {
              text: `${colors.cyan}Command: /${cmd}${colors.reset}
${colors.gray}${'─'.repeat(30)}${colors.reset}
Description: ${cmdInfo.description}
Usage: ${cmdInfo.usage}`,
            };
          }
          return { text: `${colors.red}Unknown command: /${cmd}${colors.reset}
Use /help to see available commands.` };
        }

        let output = `${colors.cyan}Available Commands${colors.reset}\n${colors.gray}${'━'.repeat(30)}${colors.reset}\n`;
        this.commands.forEach((cmd, name) => {
          output += `${colors.green}/${name.padEnd(12)}${colors.reset} ${colors.gray}${cmd.description}${colors.reset}\n`;
        });
        output += `\n${colors.gray}Use /help <command> for detailed info${colors.reset}`;
        return { text: output };
      },
    });

    // /info - Version info
    this.register('info', {
      description: 'Show version information',
      usage: '/info',
      execute: () => ({
        text: `${colors.cyan}PopeBot Chat Command Processor${colors.reset}
Version: 1.0.0
Author: PopeBot

A terminal chat-style command system`,
      }),
    });

    // /ping - Test connectivity
    this.register('ping', {
      description: 'Test system responsiveness',
      usage: '/ping',
      execute: () => {
        const start = Date.now();
        const latency = Date.now() - start;
        return {
          text: `${colors.green}pong!${colors.reset} ${colors.gray}(~${latency}ms)${colors.reset}`,
        };
      },
    });

    // /echo - Echo text
    this.register('echo', {
      description: 'Echo text back',
      usage: '/echo <text>',
      execute: (args) => ({
        text: args.join(' ') || 'You said nothing!',
      }),
    });

    // /time - Current time
    this.register('time', {
      description: 'Show current time',
      usage: '/time',
      execute: () => ({
        text: `${colors.cyan}Current Time${colors.reset}\n${new Date().toLocaleString()}`,
      }),
    });

    // /joke - Random joke
    this.register('joke', {
      description: 'Tell a random joke',
      usage: '/joke',
      execute: () => {
        const jokes = [
          "Why do programmers prefer dark mode? Because light attracts bugs!",
          "Why did the AI go to school? To improve its learning rate!",
          "What's a computer's favorite snack? Microchips!",
          "Why do developers hate nature? Too many bugs!",
          "How many programmers does it take to change a light bulb? None, it's a hardware problem!",
        ];
        return { text: `${colors.yellow}😄 ${jokes[Math.floor(Math.random() * jokes.length)]}${colors.reset}` };
      },
    });

    // /clear - Clear screen ANSI
    this.register('clear', {
      description: 'Clear the terminal',
      usage: '/clear',
      execute: () => ({
        text: '\x1b[2J\x1b[H',
        raw: true,
      }),
    });

    // /roll - Roll dice
    this.register('roll', {
      description: 'Roll a dice (e.g., /roll 6)',
      usage: '/roll [sides]',
      execute: (args) => {
        const sides = parseInt(args[0]) || 6;
        const result = Math.floor(Math.random() * sides) + 1;
        return {
          text: `${colors.green}🎲 Rolled d${sides}: ${colors.bold}${result}${colors.reset}`,
        };
      },
    });

    // /coin - Flip coin
    this.register('coin', {
      description: 'Flip a coin',
      usage: '/coin',
      execute: () => ({
        text: `${colors.yellow}🪙 ${Math.random() > 0.5 ? 'Heads' : 'Tails'}${colors.reset}`,
      }),
    });

    // /quote - Random quote
    this.register('quote', {
      description: 'Show an inspiring quote',
      usage: '/quote',
      execute: () => {
        const quotes = [
          { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
          { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
          { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
          { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
          { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
        ];
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        return {
          text: `${colors.cyan}"${q.text}"${colors.reset}\n${colors.gray}— ${q.author}${colors.reset}`,
        };
      },
    });
  }

  register(name, command) {
    this.commands.set(name, command);
  }

  unregister(name) {
    this.commands.delete(name);
  }

  parse(input) {
    // Strip leading whitespace
    const cleanInput = input.trim();
    
    // Must start with /
    if (!cleanInput.startsWith('/')) {
      return null;
    }

    // Parse command and args
    const parts = cleanInput.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return { command, args };
  }

  process(input) {
    const parsed = this.parse(input);

    if (!parsed) {
      return {
        success: false,
        text: `${colors.gray}Not a command (use /help for help)${colors.reset}`,
      };
    }

    const { command, args } = parsed;
    const cmd = this.commands.get(command);

    if (!cmd) {
      return {
        success: false,
        text: `${colors.red}Unknown command: /${command}${colors.reset}\nUse /help to see available commands.`,
      };
    }

    try {
      const result = cmd.execute(args);
      return { success: true, ...result };
    } catch (e) {
      return {
        success: false,
        text: `${colors.red}Error executing /${command}: ${e.message}${colors.reset}`,
      };
    }
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help') {
      console.log('Chat Command Processor - Terminal chat-style commands');
      console.log('');
      console.log('Usage:');
      console.log('  cmd.js process "/command args"     Process a single command');
      console.log('  cmd.js --interactive              Run in interactive mode');
      console.log('  cmd.js --list                     List all commands');
      console.log('');
      console.log('Commands:');
      this.commands.forEach((cmd, name) => {
        console.log(`  /${name.padEnd(12)} ${cmd.description}`);
      });
      process.exit(0);
    }

    if (command === '--list') {
      console.log(`${colors.cyan}Available Commands${colors.reset}\n`);
      this.commands.forEach((cmd, name) => {
        console.log(`${colors.green}/${name}${colors.reset}`);
        console.log(`  ${cmd.description}`);
        console.log(`  Usage: ${cmd.usage}`);
        console.log();
      });
      process.exit(0);
    }

    if (command === '--interactive') {
      console.log(`${colors.cyan}🤖 PopeBot Chat Commands${colors.reset}`);
      console.log(`${colors.gray}Type /help for commands, /quit to exit${colors.reset}\n`);

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${colors.green}>${colors.reset} `,
      });

      rl.prompt();

      rl.on('line', (line) => {
        if (line.trim() === '/quit' || line.trim() === '/exit') {
          console.log(`${colors.gray}Goodbye! 👋${colors.reset}`);
          rl.close();
          return;
        }

        const result = this.process(line.trim());
        if (result.raw) {
          process.stdout.write(result.text);
        } else {
          console.log(result.text);
        }

        rl.prompt();
      });

      rl.on('close', () => {
        process.exit(0);
      });
      
      return;
    }

    if (command === 'process') {
      const input = args.slice(1).join(' ');
      if (!input) {
        console.error('Usage: cmd.js process "/command args"');
        process.exit(1);
      }

      const result = this.process(input);
      if (result.raw) {
        process.stdout.write(result.text);
      } else {
        console.log(result.text);
      }
      
      process.exit(result.success ? 0 : 1);
    }

    console.error(`Unknown subcommand: ${command}`);
    process.exit(1);
  }
}

if (require.main === module) {
  const processor = new ChatCommandProcessor();
  processor.run();
}

module.exports = { ChatCommandProcessor };
