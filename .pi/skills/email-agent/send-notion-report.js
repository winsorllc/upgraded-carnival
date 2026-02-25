#!/usr/bin/env node

/**
 * Email Progress Report - Notion Skill Development
 * Saves report to file (email credentials not configured)
 */

const fs = require('fs');
const path = require('path');

async function sendProgressReport() {
  const subject = 'PopeBot Skill Development - Notion Integration - Feb 25 2026';
  
  const body = `╔══════════════════════════════════════════════════════════════════════════════╗
║               POPE BOT SKILL DEVELOPMENT REPORT - 8 AM                               ║
║                              February 25, 2026                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

PROJECT: Repository Scan & New Skill Implementation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 WHAT WAS BUILT

A new "notion" skill for PopeBot that enables the agent to interact with 
Notion workspaces - reading pages, searching content, creating/updating pages,
and querying databases.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 RESEARCH FINDINGS

Scanned three repositories for new tools, skills, and architectures:

1. zeroclaw-labs/zeroclaw (Rust-based AI agent infrastructure)
   - Key innovations: trait-driven architecture, secure-by-default runtime
   - Notable: Runs on $10 hardware with <5MB RAM
   - Skill Forge: dynamic skill evaluation/integration system

2. openclaw/openclaw (TypeScript AI assistant - 50+ skills)
   - Notable skills: skill-creator, nano-pdf, obsidian, clawhub
   - Strong integration ecosystem with marketplace
   - Multi-channel support (WhatsApp, Telegram, Slack, Discord, etc.)

3. stephengpope/thepopebot (This project!)
   - Current architecture: Two-layer (event handler + docker agent)
   - Already has: sop-engine, memory-agent, modify-self skills

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ NEW SKILL: notion

Location: /job/.pi/skills/notion/

Features:
• Search Notion workspace for pages and databases
• Read page metadata and content (blocks)
• Query Notion databases with filters
• Create new pages with content
• Append blocks to existing pages
• Create new databases with custom properties

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 TEST RESULTS

✅ Help output displays correctly - PASSED
✅ Search command help - PASSED
✅ Missing API key shows error - PASSED
✅ Search with API key handles error gracefully - PASSED
✅ Unknown command shows error - PASSED
✅ Page command without ID shows error - PASSED
✅ Blocks command without ID shows error - PASSED
✅ Query command without ID shows error - PASSED
✅ Create page without options shows error - PASSED
✅ Create page without title shows error - PASSED
✅ Append blocks without content shows error - PASSED
✅ Create database without options shows error - PASSED
✅ CLI file is valid JavaScript - PASSED
✅ Package.json is valid - PASSED
✅ SKILL.md contains required sections - PASSED
✅ --api-key flag is recognized - PASSED
✅ Invalid filter JSON shows error - PASSED
✅ databases command exists - PASSED

All 18 tests passed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 FILES CREATED

1. /job/.pi/skills/notion/SKILL.md (5.5 KB)
   - Skill documentation with setup instructions and usage examples

2. /job/.pi/skills/notion/notion.js (17.7 KB)
   - Main CLI implementation with all Notion operations

3. /job/.pi/skills/notion/package.json (271 bytes)
   - Node.js package configuration with @notionhq/client dependency

4. /job/.pi/skills/notion/test.js (8.5 KB)
   - Comprehensive test suite (18 tests)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 IMPLEMENTATION DETAILS

Architecture:
- CLI tool using @notionhq/client official SDK
- Command-based interface: search, page, blocks, databases, query, create-page, append-blocks, create-database
- Environment variable support: NOTION_API_KEY or --api-key flag

Security:
- Uses official Notion API (not scraping)
- Requires explicit page sharing for access
- API key passed via env var or CLI flag

Setup Requirements:
1. Create Notion integration at notion.so/my-integrations
2. Copy integration secret (starts with "secret_")
3. Share target pages/databases with the integration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 CODE SAMPLES

CLI Usage:
  # Set API key
  export NOTION_API_KEY="secret_xxxxx"
  
  # Search workspace
  notion search "meeting notes"
  
  # Get page content
  notion blocks "PAGE_ID"
  
  # Query database
  notion query "DATABASE_ID" --filter '{"Status": {"select": {"equals": "Done"}}}'
  
  # Create page
  notion create-page --parent "PARENT_ID" --title "New Page" --content "Hello world"

Programmatic Usage:
  const { Client } = require('@notionhq/client');
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  
  // Search
  const results = await notion.search({ query: 'documentation' });
  
  // Get page blocks
  const blocks = await notion.blocks.children.list({ page_id: pageId });

Sample JSON Output - Search Results:
{
  "results": [
    {
      "id": "page-id-123",
      "title": "Project Specification",
      "url": "https://notion.so/page-id-123",
      "lastEdited": "2024-01-15T10:30:00Z"
    }
  ],
  "hasMore": false
}

Sample JSON Output - Database Query:
{
  "results": [
    {
      "id": "entry-id-789",
      "properties": {
        "Name": { "title": [{ "plain_text": "Task 1" }] },
        "Status": { "select": { "name": "In Progress" } },
        "Due Date": { "date": { "start": "2024-02-01" } }
      }
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHY THIS SKILL WAS CHOSEN

Notion is widely used for:
- Team documentation and knowledge bases
- Project management and tracking databases
- Meeting notes and sprint planning
- Technical specifications and API docs

This skill fills a clear gap - PopeBot can now access the same 
documentation sources that teams use for collaboration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 NEXT STEPS

To activate:
  ln -s ../../pi-skills/notion .pi/skills/notion
  
To test with real API:
  export NOTION_API_KEY="your_integration_secret"
  notion search "test"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report generated by PopeBot Agent
Repository: https://github.com/stephengpope/thepopebot
Skill: notion v1.0.0
`;

  // Check for nodemailer
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    nodemailer = null;
  }
  
  const user = process.env.POPEBOT_EMAIL_USER || process.env.AGENT_LLM_POPEBOT_EMAIL_USER;
  const pass = process.env.POPEBOT_EMAIL_PASS || process.env.AGENT_LLM_POPEBOT_EMAIL_PASS;
  
  if (!user || !pass || !nodemailer) {
    console.log('\n📧 EMAIL CREDENTIALS NOT CONFIGURED');
    console.log('To enable email, set:');
    console.log('  POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS');
    console.log('');
    
    // Save to file as fallback
    const outputDir = '/job/tmp';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'progress-report-notion-' + Date.now() + '.txt');
    const fullEmail = 'To: winsorllc@yahoo.com\nSubject: ' + subject + '\n\n' + body;
    fs.writeFileSync(outputPath, fullEmail);
    console.log('✓ Report saved to: ' + outputPath);
    
    // Also output to stdout for visibility
    console.log('\n' + '='.repeat(70));
    console.log('REPORT PREVIEW:');
    console.log('='.repeat(70));
    console.log(body);
    
    return { success: false, saved: outputPath };
  }
  
  // Create transporter and send
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: user, pass: pass }
  });
  
  const mailOptions = {
    from: '"PopeBot Agent" <' + user + '>',
    to: 'winsorllc@yahoo.com',
    subject: subject,
    text: body
  };
  
  try {
    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Failed to send email:', error.message);
    const outputPath = '/job/tmp/progress-report-notion-' + Date.now() + '.txt';
    const fullEmail = 'To: winsorllc@yahoo.com\nSubject: ' + subject + '\n\n' + body;
    fs.writeFileSync(outputPath, fullEmail);
    console.log('✓ Report saved to: ' + outputPath);
    return { success: false, saved: outputPath, error: error.message };
  }
}

// Run if executed directly
if (require.main === module) {
  sendProgressReport()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { sendProgressReport };
