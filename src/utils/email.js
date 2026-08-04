const { smtp, clientUrl } = require('../config/env');

async function sendMail({ to, subject, text, html }) {
  const hasSmtp = Boolean(smtp.host && smtp.user && smtp.pass);

  if (!hasSmtp) {
    console.log('[email:stub]', { to, subject, text });
    return { stubbed: true };
  }

  // Lazy-require so the app runs without nodemailer until SMTP is configured
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    console.log('[email:stub] nodemailer not installed — logging instead', {
      to,
      subject,
      text,
    });
    return { stubbed: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  return transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    html: html || text,
  });
}

async function sendVerificationEmail(user, rawToken) {
  const link = `${clientUrl}/verify-email?token=${rawToken}`;
  return sendMail({
    to: user.email,
    subject: 'Verify your 3D Forge account',
    text: `Hi ${user.name},\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = `${clientUrl}/reset-password?token=${rawToken}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your 3D Forge password',
    text: `Hi ${user.name},\n\nReset your password: ${link}\n\nThis link expires in 1 hour.`,
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
