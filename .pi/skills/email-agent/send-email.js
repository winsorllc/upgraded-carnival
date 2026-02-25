const { z } = require('zod');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const sendEmailSkill = {
    name: 'send_email',
    description: 'Send an email from PopeBot via Gmail SMTP to the user or an external contact. Use this when the user explicitly requests to be emailed or when a long-running research job needs to deliver final results directly.',
    schema: z.object({
        to: z.string().describe('The destination email address (e.g. winsorllc@yahoo.com)'),
        subject: z.string().describe('A concise, descriptive subject line for the email.'),
        body: z.string().describe('The main content of the email in plain text or markdown.'),
        isImportant: z.boolean().optional().describe('Set to true if this is an urgent notification.')
    }),
    async execute({ to, subject, body, isImportant }, context) {
        const user = process.env.AGENT_LLM_POPEBOT_EMAIL_USER || process.env.POPEBOT_EMAIL_USER;
        const pass = process.env.AGENT_LLM_POPEBOT_EMAIL_PASS || process.env.POPEBOT_EMAIL_PASS;

        if (!user || !pass) {
            throw new Error("PopeBot's Gmail SMTP is not configured. The USER must set POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS in their environment.");
        }

        const finalSubject = isImportant ? `[URGENT] ${subject}` : subject;

        // Use Python's built-in smtplib to avoid Node module dependency issues in the Docker Sandbox
        const pythonScript = `
import smtplib
from email.message import EmailMessage
import sys
import os

msg = EmailMessage()
msg.set_content(sys.argv[3])
msg['Subject'] = sys.argv[2]
msg['From'] = f"The War Room Agent <{sys.argv[1]}>"
msg['To'] = sys.argv[4]

try:
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(sys.argv[1], os.environ['SMTP_PASS'])
    server.send_message(msg)
    server.quit()
    sys.exit(0)
except Exception as e:
    print(str(e))
    sys.exit(1)
`;

        const scriptBase64 = Buffer.from(pythonScript).toString('base64');

        try {
            // Execute Python strictly, passing secrets securely via env to avoid argument injection
            const cmd = \`echo "\${scriptBase64}" | base64 -d | python3 - "\${user}" "\${finalSubject}" "\${body}" "\${to}"\`;
      const { stdout, stderr } = await execPromise(cmd, {
        env: { ...process.env, SMTP_PASS: pass }
      });

      return {
        success: true,
        message: \`Email successfully sent to \${to}\`,
      };

    } catch (error) {
      console.error("Failed to send email via SMTP:", error);
      throw new Error(\`SMTP Error while sending to \${to}: \${error.message}\` + (error.stderr || ''));
    }
  }
};

module.exports = sendEmailSkill;
