#!/usr/bin/env node
/**
 * Data Faker - Generate mock data for testing
 */

const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia",
  "Liam", "Noah", "Oliver", "Elijah", "Lucas", "Mason", "Ethan", "Logan"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker"
];

const streets = [
  "Main St", "Oak Ave", "Park Rd", "Maple Ln", "Washington Blvd", "Lake St",
  "Cedar Ct", "Elm Dr", "Pine St", "Willow Way", "Highland Ave", "Jefferson St",
  "Broadway", "Market St", "First Ave", "Second St", "Third Ave", "Fourth St"
];

const cities = [
  "Springfield", "Franklin", "Greenville", "Clinton", "Madison", "Monroe",
  "Washington", "Jefferson", "Adams", "Jackson", "Lincoln", "Cleveland",
  "Denver", "Austin", "Portland", "Seattle", "Boston", "Atlanta", "Phoenix"
];

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const companySuffixes = [
  "Corp", "Inc", "LLC", "Ltd", "Solutions", "Technologies", "Systems", "Group",
  "Partners", "Associates", "Services", "Industries", "Holdings", "Ventures"
];

const industries = [
  "Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Retail",
  "Consulting", "Real Estate", "Energy", "Transportation", "Entertainment", "Agriculture"
];

const buzzWords = [
  "innovative", "scalable", "sustainable", "cutting-edge", "enterprise",
  "integrated", "streamlined", "cost-effective", "user-friendly", "world-class",
  "strategic", "dynamic", "proactive", "responsive", "agile", "sophisticated"
];

const products = [
  "Widget", "Service", "Platform", "Application", "Device", "Tool",
  "System", "Solution", "Framework", "Engine", "Module", "Kit"
];

const categories = [
  "Software", "Hardware", "Services", "Infrastructure", "Security",
  "Analytics", "Communication", "Storage", "Networking", "Development"
];

const loremWords = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur",
  "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui",
  "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"
];

const domains = [
  "example.com", "test.com", "demo.org", "sample.net", "fake.company",
  "mock.io", "dev.local", "testapp.dev"
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLetter() {
  return String.fromCharCode(97 + Math.floor(Math.random() * 26));
}

function generateFirstName() {
  return randomElement(firstNames);
}

function generateLastName() {
  return randomElement(lastNames);
}

function generateEmail(firstName, lastName) {
  const domain = randomElement(domains);
  const formats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randomInt(1, 999)}`,
    `${lastName.toLowerCase()}.${firstName.toLowerCase()}`
  ];
  return `${randomElement(formats)}@${domain}`;
}

function generatePhone() {
  const area = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `${area}-${prefix}-${line}`;
}

function generateAddress() {
  const num = randomInt(1, 9999);
  const street = randomElement(streets);
  const city = randomElement(cities);
  const state = randomElement(states);
  const zip = randomInt(10000, 99999).toString();
  
  return {
    street: `${num} ${street}`,
    city,
    state,
    zip,
    country: "USA"
  };
}

function generateBirthday() {
  const year = randomInt(1960, 2005);
  const month = randomInt(1, 12).toString().padStart(2, '0');
  const day = randomInt(1, 28).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateUsername(firstName, lastName) {
  const formats = [
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()[0]}`,
    `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randomInt(1, 9999)}`
  ];
  return randomElement(formats);
}

function generatePerson() {
  const firstName = generateFirstName();
  const lastName = generateLastName();
  
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: generateEmail(firstName, lastName),
    phone: generatePhone(),
    username: generateUsername(firstName, lastName),
    birthday: generateBirthday(),
    address: generateAddress()
  };
}

function generateCompany() {
  const prefix = randomElement(['', 'The ', 'United ', 'Global ', 'National ']);
  const name = `${prefix}${randomElement(lastNames)} ${randomElement(companySuffixes)}`;
  const buzz = randomElement(buzzWords);
  const phrase = `${buzz.charAt(0).toUpperCase() + buzz.slice(1)} ${randomElement(buzzWords)} ${randomElement(products).toLowerCase()}`;
  
  const baseName = name.replace(/[^a-zA-Z]/g, '').toLowerCase();
  
  return {
    name,
    catchPhrase: phrase,
    industry: randomElement(industries),
    website: `${baseName}.com`,
    email: `info@${baseName}.com`,
    phone: generatePhone(),
    address: generateAddress()
  };
}

function generateProduct() {
  const adjectives = ['Premium', 'Advanced', 'Smart', 'Dynamic', 'Professional', 'Essential'];
  const name = `${randomElement(adjectives)} ${randomElement(products)}`;
  const price = (Math.random() * 1000 + 19.99).toFixed(2);
  
  return {
    name,
    description: generateLorem(1, 0, 15).trim() + '.',
    price: parseFloat(price),
    currency: 'USD',
    category: randomElement(categories),
    sku: `${randomLetter().toUpperCase()}${randomLetter().toUpperCase()}-${randomInt(1000, 9999)}`
  };
}

function generateLorem(paragraphs = 1, sentences = 3, wordsOverride = null) {
  const result = [];
  
  for (let p = 0; p < paragraphs; p++) {
    const paraSentences = [];
    const sentCount = wordsOverride ? 1 : randomInt(sentences, sentences + 2);
    
    for (let s = 0; s < sentCount; s++) {
      const wordCount = wordsOverride || randomInt(8, 20);
      const words = [];
      for (let w = 0; w < wordCount; w++) {
        words.push(randomElement(loremWords));
      }
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      paraSentences.push(words.join(' ') + '.');
    }
    result.push(paraSentences.join(' '));
  }
  
  return result.join('\n\n');
}

function generateInternet() {
  const tld = randomElement(['com', 'org', 'net', 'io', 'dev', 'app']);
  const name = generateCompany().name.replace(/[^a-zA-Z]/g, '').toLowerCase().substring(0, 10);
  
  return {
    domain: `${name}.${tld}`,
    url: `https://${name}.${tld}`,
    ip: `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`,
    ipv6: `2001:db8:${randomInt(0, 9999)}:${randomInt(0, 9999)}::${randomInt(0, 9999)}`,
    username: generateUsername(randomElement(firstNames), randomElement(lastNames))
  };
}

function generateCombined() {
  return {
    person: generatePerson(),
    company: generateCompany(),
    account: {
      created: new Date(randomInt(2015, 2024), randomInt(0, 11), randomInt(1, 28)).toISOString().split('T')[0],
      tier: randomElement(['Free', 'Basic', 'Pro', 'Enterprise']),
      active: Math.random() > 0.1
    }
  };
}

function generateCSV(data, headers) {
  const lines = [headers.join(',')];
  
  for (const item of data) {
    const values = headers.map(h => {
      let val = item[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val === undefined || val === null ? '' : val;
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

function parseArgs(args) {
  const result = {
    command: args[0],
    count: 1,
    format: 'json',
    output: null,
    sentences: 3,
    paragraphs: 1,
    words: null
  };
  
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--count': result.count = parseInt(args[++i]); break;
      case '--format': result.format = args[++i]; break;
      case '--output': result.output = args[++i]; break;
      case '--sentences': result.sentences = parseInt(args[++i]); break;
      case '--paragraphs': result.paragraphs = parseInt(args[++i]); break;
      case '--words': result.words = parseInt(args[++i]); break;
    }
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('Data Faker - Generate mock data');
    console.log('');
    console.log('Usage: faker.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  person                 Generate person data');
    console.log('  company                Generate company data');
    console.log('  product                Generate product data');
    console.log('  internet               Generate internet data');
    console.log('  lorem                  Generate lorem ipsum text');
    console.log('  combined               Generate combined dataset');
    console.log('  json                   Generate JSON data');
    console.log('  csv                    Generate CSV data');
    console.log('');
    console.log('Options:');
    console.log('  --count <n>           Number of items (default: 1)');
    console.log('  --format json|pretty   JSON format');
    console.log('  --output <file>        Save to file');
    console.log('  --sentences <n>        For lorem: sentences per paragraph');
    console.log('  --paragraphs <n>       For lorem: number of paragraphs');
    console.log('  --words <n>            For lorem: number of words total');
    process.exit(1);
  }
  
  let result;
  let output = '';
  
  switch (args.command) {
    case 'person':
      result = args.count === 1 ? generatePerson() : Array.from({ length: args.count }, generatePerson);
      break;
      
    case 'company':
      result = args.count === 1 ? generateCompany() : Array.from({ length: args.count }, generateCompany);
      break;
      
    case 'product':
      result = args.count === 1 ? generateProduct() : Array.from({ length: args.count }, generateProduct);
      break;
      
    case 'internet':
      result = args.count === 1 ? generateInternet() : Array.from({ length: args.count }, generateInternet);
      break;
      
    case 'lorem':
      output = generateLorem(args.paragraphs, args.sentences, args.words);
      result = { text: output };
      break;
      
    case 'combined':
      result = args.count === 1 ? generateCombined() : Array.from({ length: args.count }, generateCombined);
      break;
      
    case 'json':
      result = Array.from({ length: args.count }, generateCombined);
      break;
      
    case 'csv':
      const people = Array.from({ length: args.count }, generatePerson);
      output = generateCSV(people, ['firstName', 'lastName', 'email', 'phone']);
      result = { csv: output };
      break;
      
    default:
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
  }
  
  const format = args.format === 'pretty' ? 2 : 0;
  
  if (args.output) {
    if (args.command === 'csv' || args.command === 'lorem') {
      output = args.command === 'lorem' ? result.text : output;
      require('fs').writeFileSync(args.output, output || JSON.stringify(result, null, 2));
    } else {
      require('fs').writeFileSync(args.output, JSON.stringify(result, null, 2));
    }
    console.log(`Saved to ${args.output}`);
  } else {
    if (args.command === 'csv' || args.command === 'lorem') {
      console.log(output || result.text || JSON.stringify(result, null, format));
    } else {
      console.log(JSON.stringify(result, null, format));
    }
  }
}

main();