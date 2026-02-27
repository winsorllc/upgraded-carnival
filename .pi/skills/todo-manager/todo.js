#!/usr/bin/env node
/**
 * Todo Manager - Task management system
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const PRIORITY_EMOJI = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

const STATUS_EMOJI = {
  pending: '○',
  doing: '◐',
  done: '✓',
};

class TodoManager {
  constructor() {
    this.todosFile = '/job/tmp/.todos.json';
    this.load();
  }

  load() {
    if (fs.existsSync(this.todosFile)) {
      this.todos = JSON.parse(fs.readFileSync(this.todosFile, 'utf8'));
    } else {
      this.todos = [];
    }
  }

  save() {
    fs.writeFileSync(this.todosFile, JSON.stringify(this.todos, null, 2));
  }

  add(description, options = {}) {
    const todo = {
      id: Date.now(),
      description,
      priority: options.priority || 'medium',
      category: options.category || 'default',
      due: options.due || null,
      status: 'pending',
      created: new Date().toISOString(),
      completed: null,
    };

    this.todos.push(todo);
    this.save();
    return todo;
  }

  list(options = {}) {
    let filtered = this.todos;

    if (options.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }
    if (options.priority) {
      filtered = filtered.filter(t => t.priority === options.priority);
    }
    if (options.category) {
      filtered = filtered.filter(t => t.category === options.category);
    }

    // Sort by priority then due date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      const pDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (pDiff !== 0) return pDiff;
      if (a.due && b.due) return new Date(a.due) - new Date(b.due);
      return 0;
    });

    return filtered;
  }

  complete(id) {
    const todo = this.todos.find(t => t.id.toString() === id.toString());
    if (todo) {
      todo.status = 'done';
      todo.completed = new Date().toISOString();
      this.save();
      return todo;
    }
    return null;
  }

  delete(id) {
    const index = this.todos.findIndex(t => t.id.toString() === id.toString());
    if (index > -1) {
      const todo = this.todos[index];
      this.todos.splice(index, 1);
      this.save();
      return todo;
    }
    return null;
  }

  printTodos(todos) {
    if (todos.length === 0) {
      console.log(`${colors.gray}No todos found${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}Todos${colors.reset}\n`);

    const pending = todos.filter(t => t.status === 'pending');
    const doing = todos.filter(t => t.status === 'doing');
    const done = todos.filter(t => t.status === 'done');

    if (pending.length > 0) {
      console.log(`${colors.yellow}Pending:${colors.reset}`);
      pending.forEach(t => this.printTodo(t));
    }

    if (doing.length > 0) {
      console.log(`\n${colors.blue}In Progress:${colors.reset}`);
      doing.forEach(t => this.printTodo(t));
    }

    if (done.length > 0) {
      console.log(`\n${colors.green}Completed:${colors.reset}`);
      done.forEach(t => this.printTodo(t));
    }

    console.log(`\n${colors.gray}Total: ${todos.length} (${pending.length} pending, ${doing.length} doing, ${done.length} done)${colors.reset}`);
  }

  printTodo(todo) {
    const priorityColor = {
      high: colors.red,
      medium: colors.yellow,
      low: colors.green,
    }[todo.priority];

    const statusColor = todo.status === 'done' ? colors.green : colors.gray;
    const dueStr = todo.due ? ` (${todo.due})` : '';
    
    console.log(`  ${statusColor}${STATUS_EMOJI[todo.status]}${colors.reset} ${priorityColor}[${todo.priority.charAt(0).toUpperCase()}]${colors.reset} ${todo.description}${colors.gray}${dueStr}${colors.reset} ${colors.cyan}#${todo.id}${colors.reset}`);
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help') {
      console.log('Todo Manager - Task management system');
      console.log('');
      console.log('Commands:');
      console.log('  add <description>              Add new todo');
      console.log('  list [--filter]                List todos');
      console.log('  complete <id>                 Mark todo as complete');
      console.log('  delete <id>                   Delete todo');
      console.log('  complete-all                   Complete all pending todos');
      console.log('');
      console.log('Options:');
      console.log('  --priority high|medium|low     Set priority');
      console.log('  --category NAME               Set category');
      console.log('  --due YYYY-MM-DD              Set due date');
      console.log('  --status pending|doing|done   Filter by status');
      process.exit(0);
    }

    const getOption = (name) => {
      const idx = args.indexOf(name);
      return idx > -1 ? args[idx + 1] : null;
    };

    switch (command) {
      case 'add': {
        const description = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        if (!description) {
          console.error('Usage: todo.js add <description> [--options]');
          process.exit(1);
        }

        const options = {
          priority: getOption('--priority'),
          category: getOption('--category'),
          due: getOption('--due'),
        };

        const todo = this.add(description, options);
        console.log(`${colors.green}✓ Added todo #${todo.id}${colors.reset}`);
        break;
      }

      case 'list':
      case 'ls': {
        const options = {};
        if (args.includes('--status')) options.status = getOption('--status');
        if (args.includes('--priority')) options.priority = getOption('--priority');
        if (args.includes('--category')) options.category = getOption('--category');

        const todos = this.list(options);
        this.printTodos(todos);
        break;
      }

      case 'complete':
      case 'done': {
        const id = args[1];
        if (!id) {
          console.error('Usage: todo.js complete <id>');
          process.exit(1);
        }

        const todo = this.complete(id);
        if (todo) {
          console.log(`${colors.green}✓ Completed "${todo.description}"${colors.reset}`);
        } else {
          console.error(`${colors.red}Todo not found${colors.reset}`);
          process.exit(1);
        }
        break;
      }

      case 'delete':
      case 'rm': {
        const id = args[1];
        if (!id) {
          console.error('Usage: todo.js delete <id>');
          process.exit(1);
        }

        const todo = this.delete(id);
        if (todo) {
          console.log(`${colors.yellow}Deleted "${todo.description}"${colors.reset}`);
        } else {
          console.error(`${colors.red}Todo not found${colors.reset}`);
          process.exit(1);
        }
        break;
      }

      case 'complete-all': {
        const pending = this.todos.filter(t => t.status === 'pending');
        pending.forEach(t => {
          t.status = 'done';
          t.completed = new Date().toISOString();
        });
        this.save();
        console.log(`${colors.green}✓ Completed ${pending.length} todo(s)${colors.reset}`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  }
}

if (require.main === module) {
  const manager = new TodoManager();
  manager.run();
}

module.exports = { TodoManager };
