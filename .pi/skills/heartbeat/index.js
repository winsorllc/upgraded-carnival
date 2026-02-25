/**
 * Heartbeat Skill for PopeBot
 * 
 * Entry point for the heartbeat system.
 * Usage: node index.js <command> [args]
 */

import scheduler from './lib/scheduler.js';
import runners from './lib/runners.js';
import status from './lib/status.js';

const { parseHeartbeatFile, scheduleHeartbeat, listHeartbeats, getHeartbeatStatus, parseInterval } = scheduler;
const { runHealthCheck, runStatusReport, runMaintenance, executeHeartbeat } = runners;
const { recordRun, getHistory, getAllStatuses, getSummary, loadHeartbeat } = status;

/**
 * CLI command handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'schedule':
        // Parse args: --name, --type, --interval
        const name = args.find((a, i) => a === '--name' && args[i + 1])?.let ? args[args.indexOf('--name') + 1] : null;
        const type = args.find((a, i) => a === '--type' && args[i + 1])?.let ? args[args.indexOf('--type') + 1] : null;
        const interval = args.find((a, i) => a === '--interval' && args[i + 1])?.let ? args[args.indexOf('--interval') + 1] : '30m';
        
        const task = await scheduleHeartbeat({
          name: name || `${type}-1`,
          type: type || 'health',
          interval,
          enabled: true
        });
        console.log('Scheduled:', JSON.stringify(task, null, 2));
        break;
        
      case 'run':
        // Run specific heartbeat or all
        const runName = args.find((a, i) => a === '--name' && args[i + 1])?.let ? args[args.indexOf('--name') + 1] : null;
        const runType = args.find((a, i) => a === '--type' && args[i + 1])?.let ? args[args.indexOf('--type') + 1] : 'health';
        
        if (runName) {
          const config = await loadHeartbeat(runName);
          if (!config) {
            console.error(`Heartbeat '${runName}' not found`);
            process.exit(1);
          }
          const result = await executeHeartbeat(config.type || 'health');
          await recordRun(runName, result);
          console.log('Result:', JSON.stringify(result, null, 2));
        } else {
          const result = await executeHeartbeat(runType);
          console.log('Result:', JSON.stringify(result, null, 2));
        }
        break;
        
      case 'list':
        const tasks = await listHeartbeats();
        console.log('Heartbeats:', JSON.stringify(tasks, null, 2));
        break;
        
      case 'status':
        const statusName = args.find((a, i) => a === '--name' && args[i + 1])?.let ? args[args.indexOf('--name') + 1] : null;
        if (statusName) {
          const hbStatus = await getHeartbeatStatus(statusName);
          console.log('Status:', JSON.stringify(hbStatus, null, 2));
        } else {
          const all = await getAllStatuses();
          console.log('All heartbeats:', JSON.stringify(all, null, 2));
        }
        break;
        
      case 'history':
        const limit = parseInt(args.find((a, i) => a === '--limit' && args[i + 1])?.let ? args[args.indexOf('--limit') + 1] : '20') || 20;
        const hist = await getHistory(limit);
        console.log('History:', JSON.stringify(hist, null, 2));
        break;
        
      case 'summary':
        const summary = await getSummary();
        console.log('Summary:', JSON.stringify(summary, null, 2));
        break;
        
      case 'parse':
        // Parse HEARTBEAT.md
        const parsedTasks = await parseHeartbeatFile();
        console.log('Parsed tasks:', JSON.stringify(parsedTasks, null, 2));
        break;
        
      case 'health':
        const healthResult = await runHealthCheck();
        await recordRun('manual-health', healthResult);
        console.log('Health check:', JSON.stringify(healthResult, null, 2));
        break;
        
      case 'report':
        const reportResult = await runStatusReport();
        await recordRun('manual-report', reportResult);
        console.log('Status report:', JSON.stringify(reportResult, null, 2));
        break;
        
      case 'maintenance':
        const maintResult = await runMaintenance();
        await recordRun('manual-maintenance', maintResult);
        console.log('Maintenance:', JSON.stringify(maintResult, null, 2));
        break;
        
      default:
        console.log(`
Heartbeat Skill for PopeBot

Usage: node index.js <command> [options]

Commands:
  schedule    Schedule a heartbeat
              --name, --type, --interval
  run         Run a heartbeat
              --name or --type
  list        List all heartbeats
  status      Get heartbeat status
              --name (optional)
  history     Get execution history
              --limit (default: 20)
  summary     Get summary statistics
  parse       Parse HEARTBEAT.md
  health      Run health check
  report      Generate status report
  maintenance Run maintenance tasks
        `.trim());
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export modules
export {
  parseHeartbeatFile,
  scheduleHeartbeat,
  listHeartbeats,
  getHeartbeatStatus,
  parseInterval,
  runHealthCheck,
  runStatusReport,
  runMaintenance,
  executeHeartbeat,
  recordRun,
  getHistory,
  getAllStatuses,
  getSummary
};

export default {
  scheduler,
  runners,
  status
};