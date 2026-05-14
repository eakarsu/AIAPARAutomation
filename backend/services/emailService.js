const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@apar-automation.com';

/**
 * Send a payment due reminder (3, 7, or 14 days before due date).
 * @param {Object} invoice - invoice record from DB
 * @param {string} recipient - email address to send to
 * @param {number} daysUntilDue - how many days until due (3, 7, or 14)
 */
async function sendPaymentDueAlert(invoice, recipient, daysUntilDue = 7) {
  const transporter = createTransporter();

  const subject = `Payment Due Reminder: Invoice ${invoice.invoice_number} due in ${daysUntilDue} day(s)`;
  const amount = Number(invoice.amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2d5be3; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Payment Due Reminder</h2>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 16px;">
          This is a reminder that the following invoice is due in <strong>${daysUntilDue} day(s)</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Invoice #</td><td style="padding: 8px;">${invoice.invoice_number}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 8px; font-weight: bold; color: #6b7280;">Vendor</td><td style="padding: 8px;">${invoice.vendor_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Amount Due</td><td style="padding: 8px; font-size: 18px; color: #1d4ed8; font-weight: bold;">${amount}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 8px; font-weight: bold; color: #6b7280;">Due Date</td><td style="padding: 8px;">${dueDate}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Status</td><td style="padding: 8px;">${invoice.match_status || 'pending'}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          Please ensure payment is made before the due date to avoid late fees.
        </p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: FROM_ADDRESS,
    to: recipient,
    subject,
    html,
    text: `Payment Due Reminder: Invoice ${invoice.invoice_number} for ${amount} from ${invoice.vendor_name} is due on ${dueDate} (in ${daysUntilDue} day(s)).`,
  });

  console.log(`[emailService] Payment due alert sent to ${recipient}: messageId=${info.messageId}`);
  return info;
}

/**
 * Send an overdue escalation email.
 * @param {Object} invoice - invoice record from DB
 * @param {number} daysOverdue - how many days past due
 * @param {string} recipient - email address to send to
 */
async function sendOverdueAlert(invoice, daysOverdue, recipient) {
  const transporter = createTransporter();

  const severity = daysOverdue > 60 ? 'CRITICAL' : daysOverdue > 30 ? 'HIGH' : 'MEDIUM';
  const subject = `[${severity}] Overdue Invoice Alert: ${invoice.invoice_number} is ${daysOverdue} days overdue`;
  const amount = Number(invoice.amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A';

  const severityColor = severity === 'CRITICAL' ? '#dc2626' : severity === 'HIGH' ? '#ea580c' : '#ca8a04';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Overdue Invoice Alert — ${severity} Priority</h2>
      </div>
      <div style="background: #fef2f2; padding: 24px; border: 1px solid #fecaca; border-radius: 0 0 8px 8px;">
        <p style="color: #991b1b; font-size: 16px; font-weight: bold;">
          Invoice ${invoice.invoice_number} is <span style="font-size: 20px;">${daysOverdue} days overdue</span>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Invoice #</td><td style="padding: 8px;">${invoice.invoice_number}</td></tr>
          <tr style="background: #fee2e2;"><td style="padding: 8px; font-weight: bold; color: #6b7280;">Vendor</td><td style="padding: 8px;">${invoice.vendor_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Amount Overdue</td><td style="padding: 8px; font-size: 18px; color: ${severityColor}; font-weight: bold;">${amount}</td></tr>
          <tr style="background: #fee2e2;"><td style="padding: 8px; font-weight: bold; color: #6b7280;">Original Due Date</td><td style="padding: 8px;">${dueDate}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Days Overdue</td><td style="padding: 8px; color: ${severityColor}; font-weight: bold;">${daysOverdue} days</td></tr>
        </table>
        ${severity === 'CRITICAL' ? '<p style="color: #7f1d1d; font-weight: bold;">⚠ This account may require legal escalation. Please take immediate action.</p>' : ''}
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          Immediate follow-up is required. Please contact the vendor and update the invoice status in the system.
        </p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: FROM_ADDRESS,
    to: recipient,
    subject,
    html,
    text: `OVERDUE ALERT [${severity}]: Invoice ${invoice.invoice_number} for ${amount} from ${invoice.vendor_name} is ${daysOverdue} days overdue (was due ${dueDate}).`,
  });

  console.log(`[emailService] Overdue alert sent to ${recipient}: messageId=${info.messageId}`);
  return info;
}

module.exports = { sendPaymentDueAlert, sendOverdueAlert };
