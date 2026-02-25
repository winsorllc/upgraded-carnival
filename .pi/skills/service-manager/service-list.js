#!/usr/bin/env node
/**
 * Service List - Show all managed services
 */
const fs = require('fs');

const SERVICES_FILE = '/tmp/managed-services.json';

function listServices() {
  try {
    if (!fs.existsSync(SERVICES_FILE)) {
      console.log('No managed services. Use service-install.js to add services.');
      return [];
    }
    
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8'));
    console.log(`📦 Managed Services (${services.length})\n`);
    
    services.forEach((s, i) => {
      const status = s.pid ? '🟢' : '⚪';
      console.log(`${i + 1}. ${status} ${s.name}`);
      console.log(`   Status: ${s.status || 'unknown'}`);
      if (s.pid) console.log(`   PID: ${s.pid}`);
      console.log(`   Created: ${s.created}`);
      console.log();
    });
    
    return services;
  } catch (err) {
    console.error('Error:', err.message);
    return [];
  }
}

listServices();

module.exports = { listServices };
