#!/usr/bin/env node
/**
 * Time Converter - Timezone and date conversion utilities
 */

const COMMON_ZONES = [
  'UTC', 'GMT',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland', 'Asia/Kolkata'
];

function parseDate(input) {
  if (!input) return new Date();
  
  // If it's a number, treat as Unix timestamp (seconds or milliseconds)
  if (!isNaN(input) && !isNaN(parseFloat(input))) {
    const num = parseFloat(input);
    // If less than 10 billion, it's probably seconds
    return num < 10000000000 ? new Date(num * 1000) : new Date(num);
  }
  
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date, format = 'ISO') {
  if (format === 'ISO') {
    return date.toISOString();
  }
  
  const pad = (n) => String(n).padStart(2, '0');
  const tokens = {
    'YYYY': date.getFullYear(),
    'MM': pad(date.getUTCMonth() + 1),
    'DD': pad(date.getUTCDate()),
    'HH': pad(date.getUTCHours()),
    'mm': pad(date.getUTCMinutes()),
    'ss': pad(date.getUTCSeconds()),
    'MMM': date.toLocaleString('en', { month: 'short' }),
    'MMMM': date.toLocaleString('en', { month: 'long' }),
    'ddd': date.toLocaleString('en', { weekday: 'short' }),
    'dddd': date.toLocaleString('en', { weekday: 'long' }),
    'YY': String(date.getFullYear()).slice(-2)
  };
  
  let result = format;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token, 'g'), value);
  }
  return result;
}

function toTimezone(date, timezone) {
  // Return timezone offset info
  try {
    const options = { timeZone: timezone, timeZoneName: 'short' };
    const str = date.toLocaleString('en-US', { ...options, hour12: false });
    return str;
  } catch (e) {
    return null;
  }
}

function getComponents(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
    dayOfWeek: date.getUTCDay(),
    dayOfWeekName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()]
  };
}

function calculateDuration(start, end) {
  const diff = end.getTime() - start.getTime();
  if (diff < 0) return null;
  
  const ms = diff;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44); // Average
  const years = Math.floor(days / 365.25);
  
  return {
    milliseconds: ms,
    seconds: seconds,
    minutes: minutes,
    hours: hours,
    days: days,
    weeks: weeks,
    months: Math.floor(months),
    years: years,
    formatted: `${years}y ${months % 12}mo ${days % 30}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`
  };
}

function parseArgs(args) {
  const result = {
    command: null,
    input: null,
    from: 'UTC',
    to: null,
    timezone: null,
    format: null
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (!result.command) {
      result.command = arg;
    } else if (!result.input && !arg.startsWith('--') && !arg.startsWith('-')) {
      result.input = arg;
    } else if ((arg === '-z' || arg === '--timezone') && args[i + 1]) {
      result.timezone = args[++i];
    } else if ((arg === '-f' || arg === '--from') && args[i + 1]) {
      result.from = args[++i];
    } else if ((arg === '-t' || arg === '--to') && args[i + 1]) {
      result.to = args[++i];
    } else if ((arg === '-fmt' || arg === '--format') && args[i + 1]) {
      result.format = args[++i];
    }
    i++;
  }
  
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('Time Converter - Timezone and date conversion utilities');
    console.log('');
    console.log('Usage: time.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  now              Current time');
    console.log('  convert <date>  Convert between timezones');
    console.log('  format <date>   Format a date');
    console.log('  duration <from> Calculate duration');
    console.log('  unix <ts>        Convert Unix timestamp to date');
    console.log('  to-unix <date>   Convert date to Unix timestamp');
    console.log('  list             List common timezones');
    console.log('');
    console.log('Options:');
    console.log('  -z, --timezone <tz>    Specify timezone');
    console.log('  -f, --from <tz>       Source timezone');
    console.log('  -t, --to <tz>         Target timezone');
    console.log('  -fmt, --format <str>  Date format string');
    console.log('');
    console.log('Examples:');
    console.log('  time.js now');
    console.log('  time.js now -z America/New_York');
    console.log('  time.js convert "2024-03-15" -t Asia/Tokyo');
    console.log('  time.js unix 1709836800');
    process.exit(1);
  }
  
  try {
    let result;
    
    switch (args.command) {
      case 'now': {
        const now = new Date();
        result = {
          utc: now.toISOString(),
          epoch_ms: now.getTime(),
          epoch_s: Math.floor(now.getTime() / 1000),
          timezone: args.timezone || 'UTC',
          formatted: args.timezone ? toTimezone(now, args.timezone) : now.toISOString(),
          components: getComponents(now)
        };
        break;
      }
      
      case 'convert': {
        if (!args.input) {
          console.log(JSON.stringify({ error: 'Date input required' }, null, 2));
          process.exit(1);
        }
        const date = parseDate(args.input);
        if (!date) {
          console.log(JSON.stringify({ error: 'Could not parse date' }, null, 2));
          process.exit(1);
        }
        result = {
          input: args.input,
          from: args.from,
          to: args.to || 'UTC',
          source: date.toISOString(),
          converted: args.to ? toTimezone(date, args.to) : date.toISOString(),
          components: getComponents(date)
        };
        break;
      }
      
      case 'format': {
        if (!args.input) {
          console.log(JSON.stringify({ error: 'Date input required' }, null, 2));
          process.exit(1);
        }
        const date = parseDate(args.input);
        if (!date) {
          console.log(JSON.stringify({ error: 'Could not parse date' }, null, 2));
          process.exit(1);
        }
        result = {
          input: args.input,
          format: args.format || 'ISO',
          formatted: args.format ? formatDate(date, args.format) : date.toISOString(),
          iso: date.toISOString()
        };
        break;
      }
      
      case 'duration': {
        if (!args.input) {
          console.log(JSON.stringify({ error: 'Start date required' }, null, 2));
          process.exit(1);
        }
        const start = parseDate(args.input);
        const end = parseDate(args.to) || new Date();
        if (!start) {
          console.log(JSON.stringify({ error: 'Could not parse start date' }, null, 2));
          process.exit(1);
        }
        result = {
          from: start.toISOString(),
          to: end.toISOString(),
          duration: calculateDuration(start, end)
        };
        break;
      }
      
      case 'unix': {
        const ts = args.input ? parseFloat(args.input) : Date.now();
        const date = new Date(ts < 10000000000 ? ts * 1000 : ts);
        result = {
          input: args.input,
          timestamp_s: Math.floor(date.getTime() / 1000),
          timestamp_ms: date.getTime(),
          iso: date.toISOString(),
          utc: date.toUTCString(),
          local: date.toLocaleString(),
          components: getComponents(date)
        };
        break;
      }
      
      case 'to-unix': {
        if (!args.input) {
          console.log(JSON.stringify({ error: 'Date input required' }, null, 2));
          process.exit(1);
        }
        const date = parseDate(args.input);
        if (!date) {
          console.log(JSON.stringify({ error: 'Could not parse date' }, null, 2));
          process.exit(1);
        }
        result = {
          input: args.input,
          timestamp_s: Math.floor(date.getTime() / 1000),
          timestamp_ms: date.getTime(),
          iso: date.toISOString()
        };
        break;
      }
      
      case 'list': {
        result = { timezones: COMMON_ZONES };
        break;
      }
      
      default:
        console.log(JSON.stringify({ error: `Unknown command: ${args.command}` }, null, 2));
        process.exit(1);
    }
    
    console.log(JSON.stringify(result, null, 2));
    
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }, null, 2));
    process.exit(1);
  }
}

main();