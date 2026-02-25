const { z } = require('zod');
const nodemailer = require('nodemailer');

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
        const user = process.env.POPEBOT_EMAIL_USER;
        const pass = process.env.POPEBOT_EMAIL_PASS;

        if (!user || !pass) {
            throw new Error("PopeBot's Gmail SMTP is not configured. The USER must set POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS in their environment.");
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: user,
                    pass: pass
                }
            });

            const mailOptions = {
                from: `"The War Room Agent (PopeBot)" <${user}>`,
                to: to,
                subject: isImportant ? `[URGENT] ${subject}` : subject,
                text: body,
            };

            const info = await transporter.sendMail(mailOptions);

            return {
                success: true,
                message: `Email successfully sent to ${to}`,
                messageId: info.messageId,
            };

        } catch (error) {
            console.error("Failed to send email via SMTP:", error);
            throw new Error(`SMTP Error while sending to ${to}: ${error.message}`);
        }
    }
};

module.exports = sendEmailSkill;
