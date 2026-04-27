import nodemailer from 'nodemailer';

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const emailService = {
  isConfigured() {
    return hasSmtpConfig() && Boolean(process.env.SMTP_FROM);
  },

  async sendPasswordResetEmail({ toEmail, userName, resetUrl }) {
    const transporter = createTransporter();
    if (!transporter || !process.env.SMTP_FROM) {
      return false;
    }

    const appName = process.env.APP_NAME || 'CodeLens AI';
    const safeName = userName || 'there';

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 560px; margin: 0 auto;">
        <h2 style="margin-bottom: 12px;">Reset your ${appName} password</h2>
        <p style="margin: 0 0 12px 0;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px 0;">We received a request to reset your password. Use the button below to set a new one.</p>
        <p style="margin: 18px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Reset Password</a>
        </p>
        <p style="margin: 0 0 8px 0;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="margin: 0 0 12px 0; word-break: break-all;">${resetUrl}</p>
        <p style="margin: 0; color: #6b7280; font-size: 12px;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: `${appName} password reset`,
      html,
      text: `Reset your ${appName} password using this link: ${resetUrl}. This link expires in 1 hour.`,
    });

    return true;
  },

  async sendWorkspaceInviteEmail({ toEmail, workspaceName, inviteUrl, inviterName }) {
    const transporter = createTransporter();
    if (!transporter || !process.env.SMTP_FROM) {
      return false;
    }

    const appName = process.env.APP_NAME || 'CodeLens AI';
    const senderName = inviterName || 'A teammate';

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 560px; margin: 0 auto;">
        <h2 style="margin-bottom: 12px;">You're invited to join ${workspaceName}</h2>
        <p style="margin: 0 0 12px 0;">${senderName} invited you to collaborate in ${appName}.</p>
        <p style="margin: 18px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Join Workspace</a>
        </p>
        <p style="margin: 0 0 8px 0;">If the button does not work, paste this link into your browser:</p>
        <p style="margin: 0 0 12px 0; word-break: break-all;">${inviteUrl}</p>
        <p style="margin: 0; color: #6b7280; font-size: 12px;">You can log in with GitHub or email, then connect your own GitHub account in settings after joining.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: `${appName} workspace invite for ${workspaceName}`,
      html,
      text: `You were invited to join ${workspaceName} in ${appName}. Use this link to join: ${inviteUrl}`,
    });

    return true;
  },
};
