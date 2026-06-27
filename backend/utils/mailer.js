const nodemailer = require('nodemailer');

// Initialize SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for 587 or other ports
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

// Verify SMTP Connection at startup if details are present
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ Mailer configuration error:', error.message);
    } else {
      console.log('✅ Mailer initialized and ready to send emails');
    }
  });
} else {
  console.log('ℹ️ Mailer is running in fallback/debug mode. (Set EMAIL_USER and EMAIL_PASS to enable real email sending).');
}

/**
 * Sends a registration confirmation email to a student.
 * 
 * @param {string} toEmail - Student's email address
 * @param {object} info - Information about the student and registration
 * @param {string} info.studentName - Name of the registered student
 * @param {string} info.workshopTitle - Title of the workshop
 * @param {string} info.trainerName - Name of the workshop trainer
 * @param {string} info.venue - Venue location of the workshop
 * @param {string} info.schedule - Schedule/timing of the workshop
 * @param {number|string} info.fee - Workshop registration fee
 * @param {boolean} info.isGroup - Is this a group registration
 * @param {string} [info.teamName] - Name of the group team (if applicable)
 */
exports.sendRegistrationEmail = async (toEmail, info) => {
  const {
    studentName,
    workshopTitle,
    trainerName,
    venue,
    schedule,
    fee,
    isGroup,
    teamName
  } = info;

  const emailFrom = process.env.EMAIL_FROM || '"Sansah Innovations" <noreply@sansah.com>';
  const subject = `Registration Confirmed: ${workshopTitle} Workshop`;

  // HTML formatted body (Premium Dark Theme matching the portal's design system)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Confirmed</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #0b0f19;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #e2e8f0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 30px 20px;
          text-align: center;
          border-bottom: 1px solid #1f2937;
        }
        .header h1 {
          color: #00f0ff;
          margin: 0;
          font-size: 24px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
        }
        .welcome {
          font-size: 16px;
          margin-bottom: 24px;
        }
        .details-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .details-card h3 {
          margin-top: 0;
          color: #00f0ff;
          border-bottom: 1px solid #334155;
          padding-bottom: 10px;
          font-size: 16px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
        }
        .details-table td {
          padding: 8px 0;
          font-size: 14px;
        }
        .details-table td.label {
          color: #94a3b8;
          font-weight: 600;
          width: 130px;
        }
        .details-table td.value {
          color: #f1f5f9;
        }
        .highlight {
          color: #00f0ff;
          font-weight: bold;
        }
        .footer {
          background: #0f172a;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #1f2937;
        }
        .footer a {
          color: #00f0ff;
          text-decoration: none;
        }
        .btn {
          display: inline-block;
          background: #00f0ff;
          color: #0b0f19;
          font-weight: 700;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          text-align: center;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Registration Confirmed</h1>
        </div>
        <div class="content">
          <p class="welcome">Dear <strong>${studentName}</strong>,</p>
          <p>Thank you for registering. Your seat for the upcoming workshop has been successfully reserved! Below are your registration and workshop details.</p>
          
          <div class="details-card">
            <h3>Workshop Highlights</h3>
            <table class="details-table">
              <tr>
                <td class="label">Workshop</td>
                <td class="value highlight">${workshopTitle}</td>
              </tr>
              <tr>
                <td class="label">Trainer</td>
                <td class="value">${trainerName || 'Industry Expert'}</td>
              </tr>
              <tr>
                <td class="label">Venue</td>
                <td class="value">${venue || 'Main Campus'}</td>
              </tr>
              <tr>
                <td class="label">Schedule</td>
                <td class="value">${schedule || 'Flexible'}</td>
              </tr>
              <tr>
                <td class="label">Registration Fee</td>
                <td class="value">₹${fee}</td>
              </tr>
              ${isGroup ? `
              <tr>
                <td class="label">Registration Mode</td>
                <td class="value">Group Registration (${teamName})</td>
              </tr>
              ` : `
              <tr>
                <td class="label">Registration Mode</td>
                <td class="value">Individual</td>
              </tr>
              `}
            </table>
          </div>

          <p>Please log in to the Student Portal to track your attendance, access resources, download course files, and view your certificate post completion.</p>
          
          <p>If you have any questions, feel free to reply directly to this mail.</p>
          
          <p>Best Regards,<br><strong>Sansah Innovations Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated email notification from Sansah Innovations College Workshop Registration Portal.</p>
          <p>&copy; 2026 Sansah Innovations. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Dear ${studentName},

Thank you for registering. Your seat for the upcoming workshop has been successfully reserved!

Workshop Details:
- Title: ${workshopTitle}
- Trainer: ${trainerName || 'Industry Expert'}
- Venue: ${venue || 'Main Campus'}
- Schedule: ${schedule || 'Flexible'}
- Fee: ₹${fee}
- Registration Mode: ${isGroup ? `Group (${teamName})` : 'Individual'}

Please log in to the Student Portal to track your attendance, access resources, and view your certificate.

Best Regards,
Sansah Innovations Team
  `.trim();

  // If email configuration is missing, log email details to console instead of failing
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('------------------------------------------------------------');
    console.log('📧 [FALLBACK/DEBUG MAILER] WOULD HAVE SENT EMAIL:');
    console.log(`FROM:    ${emailFrom}`);
    console.log(`TO:      ${toEmail}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT:`);
    console.log(textContent);
    console.log('------------------------------------------------------------');
    return { success: true, logged: true };
  }

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to: toEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`✅ Registration confirmation email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send registration email to ${toEmail}:`, error);
    return { success: false, error: error.message };
  }
};
