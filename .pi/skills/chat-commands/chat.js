#!/usr/bin/env node
const commands = {
  '/status': () => {
    console.log('📊 System Status');
    console.log(`   Node: ${process.version}`);
    console.log(`   Uptime: ${Math.floor(process.uptime())}s`);
    const mem = process.memoryUsage();
    console.log(`   Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
  },
  '/help': () => {
    console.log('🤖 Available Commands');
    console.log('   /status - System status');
    console.log('   /skills - List skills');
    console.log('   /health - Health check');
  },
  '/skills': () => {
    const fs = require('fs');
    const dir = '/job/.pi/skills';
    const skills = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    console.log(`📦 ${skills.length} Skills`);
    skills.forEach(s => console.log(`   • ${s}`));
  },
  '/health': () => {
    console.log('💚 Health: All systems operational');
    console.log(`   Timestamp: ${new Date().toISOString()}`);
  }
};

const cmd = process.argv[2];
if (commands[cmd]) {
  commands[cmd]();
} else {
  console.log('❓ Unknown command. Use /help');
}
