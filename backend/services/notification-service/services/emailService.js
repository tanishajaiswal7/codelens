import axios from 'axios'
import nodemailer from 'nodemailer'

const getMailConfig = () => ({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
  secure: String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || 'false') === 'true',
  user: process.env.SMTP_USER || process.env.EMAIL_USER,
  pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  from: process.env.SMTP_FROM || process.env.EMAIL_FROM,
  provider: (process.env.EMAIL_PROVIDER || '').trim().toLowerCase(),
  resendApiKey: process.env.RESEND_API_KEY,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  mailgunApiKey: process.env.MAILGUN_API_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
})

const buildPlainTextInvite = (workspaceName, inviteUrl) => (
  `You have been invited to join ${workspaceName} on CodeLens AI.\n\n` +
  `Open this link to join the workspace:\n${inviteUrl}\n\n` +
  'This invite expires in 7 days.'
)

const createTransporter = (config) => {
  if (!config.user || !config.pass) {
    return null
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 60000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 60000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 60000),
    requireTLS: !config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

const getTransportAttempts = (config) => {
  const attempts = [
    {
      host: config.host,
      port: config.port,
      secure: config.secure,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 60000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 60000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 60000),
      requireTLS: !config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    },
  ]

  if (config.host === 'smtp.gmail.com' && config.port !== 465) {
    attempts.push({
      host: config.host,
      port: 465,
      secure: true,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 60000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 60000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 60000),
      requireTLS: false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })
  }

  return attempts
}

const sendViaResend = async (config, { toEmail, workspaceName, inviteUrl }) => {
  if (!config.resendApiKey) return false

  const subject = `You have been invited to ${workspaceName} on CodeLens AI`
  const html = buildInviteHtml(workspaceName, inviteUrl)

  await axios.post(
    'https://api.resend.com/emails',
    {
      from: config.from || 'CodeLens AI <noreply@codelens.ai>',
      to: [toEmail],
      subject,
      html,
      text: buildPlainTextInvite(workspaceName, inviteUrl),
      reply_to: config.from || config.user || undefined,
    },
    {
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: Number(process.env.EMAIL_HTTP_TIMEOUT || 15000),
    }
  )

  console.log(`[Email] Invite sent to ${toEmail} via Resend`)
  return true
}

const sendViaSendGrid = async (config, { toEmail, workspaceName, inviteUrl }) => {
  if (!config.sendgridApiKey) return false

  const subject = `You have been invited to ${workspaceName} on CodeLens AI`

  await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [{ to: [{ email: toEmail }], subject }],
      from: {
        email: (config.from || 'noreply@codelens.ai').replace(/^.*<|>$/g, '').trim(),
        name: 'CodeLens AI',
      },
      reply_to: config.from ? { email: config.from.replace(/^.*<|>$/g, '').trim() } : undefined,
      content: [
        { type: 'text/plain', value: buildPlainTextInvite(workspaceName, inviteUrl) },
        { type: 'text/html', value: buildInviteHtml(workspaceName, inviteUrl) },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${config.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: Number(process.env.EMAIL_HTTP_TIMEOUT || 15000),
    }
  )

  console.log(`[Email] Invite sent to ${toEmail} via SendGrid`)
  return true
}

const sendViaMailgun = async (config, { toEmail, workspaceName, inviteUrl }) => {
  if (!config.mailgunApiKey || !config.mailgunDomain) return false

  const fromAddress = config.from || 'CodeLens AI <noreply@codelens.ai>'
  const auth = {
    username: 'api',
    password: config.mailgunApiKey,
  }

  const form = new URLSearchParams()
  form.set('from', fromAddress)
  form.set('to', toEmail)
  form.set('subject', `You have been invited to ${workspaceName} on CodeLens AI`)
  form.set('text', buildPlainTextInvite(workspaceName, inviteUrl))
  form.set('html', buildInviteHtml(workspaceName, inviteUrl))

  await axios.post(
    `https://api.mailgun.net/v3/${config.mailgunDomain}/messages`,
    form,
    {
      auth,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: Number(process.env.EMAIL_HTTP_TIMEOUT || 15000),
    }
  )

  console.log(`[Email] Invite sent to ${toEmail} via Mailgun`)
  return true
}

const buildInviteHtml = (workspaceName, inviteUrl) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#09090b;padding:24px;border-radius:8px 8px 0 0">
      <h1 style="color:white;font-size:20px;margin:0">CodeLens AI</h1>
    </div>
    <div style="background:#f9fafb;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
      <h2 style="color:#111;font-size:18px;margin:0 0 16px">
        You have been invited to join ${workspaceName}
      </h2>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
        Someone has invited you to collaborate on CodeLens AI.
        Click the button below to join the workspace.
      </p>
      <a href="${inviteUrl}"
         style="display:inline-block;background:#4f46e5;color:white;
                padding:12px 24px;border-radius:6px;text-decoration:none;
                font-size:14px;font-weight:500">
        Join workspace
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
        If the button does not work, copy this link: ${inviteUrl}
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">
        This invite expires in 7 days.
      </p>
    </div>
  </div>
`

const buildMailHeaders = (config, subject) => {
  const senderEmail = config.user
  const configuredFrom = (config.from || '').trim()
  const fromAddress = senderEmail
    ? `CodeLens AI <${senderEmail}>`
    : configuredFrom
      ? configuredFrom
      : 'CodeLens AI <noreply@codelens.ai>'

  const replyTo = configuredFrom && configuredFrom !== senderEmail ? configuredFrom : senderEmail

  return {
    from: fromAddress,
    replyTo,
    subject,
  }
}

export const emailService = {
  async sendWorkspaceInviteEmail({
    toEmail,
    workspaceName,
    inviteUrl,
  }) {
    const config = getMailConfig()
    const transporter = createTransporter(config)

    if (config.provider === 'resend') {
      try {
        return await sendViaResend(config, { toEmail, workspaceName, inviteUrl })
      } catch (err) {
        console.error('[Email] Resend invite failed:', err.message)
        return false
      }
    }

    if (config.provider === 'sendgrid') {
      try {
        return await sendViaSendGrid(config, { toEmail, workspaceName, inviteUrl })
      } catch (err) {
        console.error('[Email] SendGrid invite failed:', err.message)
        return false
      }
    }

    if (config.provider === 'mailgun') {
      try {
        return await sendViaMailgun(config, { toEmail, workspaceName, inviteUrl })
      } catch (err) {
        console.error('[Email] Mailgun invite failed:', err.message)
        return false
      }
    }

    if (!transporter || !config.from) {
      console.log('[Email] Not configured — invite email skipped')
      return false
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#09090b;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:white;font-size:20px;margin:0">CodeLens AI</h1>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
          <h2 style="color:#111;font-size:18px;margin:0 0 16px">
            You have been invited to join ${workspaceName}
          </h2>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
            Someone has invited you to collaborate on CodeLens AI.
            Click the button below to join the workspace.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#4f46e5;color:white;
                    padding:12px 24px;border-radius:6px;text-decoration:none;
                    font-size:14px;font-weight:500">
            Join workspace
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
            If the button does not work, copy this link: ${inviteUrl}
          </p>
          <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">
            This invite expires in 7 days.
          </p>
        </div>
      </div>
    `

    try {
      const mailHeaders = buildMailHeaders(
        config,
        `You have been invited to ${workspaceName} on CodeLens AI`
      )

      const envelopeFrom = config.user || config.from || 'noreply@codelens.ai'

      const message = {
        from: mailHeaders.from,
        replyTo: mailHeaders.replyTo,
        envelope: {
          from: envelopeFrom,
          to: toEmail,
        },
        to: toEmail,
        subject: mailHeaders.subject,
        html,
      }

      let lastError = null
      for (const transportOptions of getTransportAttempts(config)) {
        try {
          await nodemailer.createTransport(transportOptions).sendMail(message)
          console.log(
            `[Email] Invite sent to ${toEmail} via ${transportOptions.host}:${transportOptions.port}`
          )
          return true
        } catch (err) {
          lastError = err
          console.error(
            `[Email] SMTP attempt failed (${transportOptions.host}:${transportOptions.port}, secure=${transportOptions.secure}):`,
            err.message
          )
        }
      }

      throw lastError || new Error('SMTP send failed')
    } catch (err) {
      console.error('[Email] Invite email failed:', err.message)
      return false
    }
  },

  async sendPRDecisionEmail({
    toEmail,
    toName,
    decision,
    feedback,
    prNumber,
    workspaceId,
    repoFullName,
  }) {
    const config = getMailConfig()
    const transporter = createTransporter(config)

    if (config.provider === 'resend' || config.provider === 'sendgrid' || config.provider === 'mailgun') {
      console.log('[Email] HTTP provider configured for invites only — skipping PR email')
      return false
    }

    // Only send if email config exists
    if (!transporter || !config.from) {
      console.log('[Email] Email not configured — skipping')
      return false
    }

    const isApproved = decision === 'approved'

    const subject = isApproved
      ? `✅ Your PR has been approved — ${repoFullName || 'CodeLens AI'}`
      : `❌ Changes requested on your PR — ${repoFullName || 'CodeLens AI'}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background: #09090b; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; font-size: 20px; margin: 0;">
            CodeLens AI
          </h1>
        </div>

        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          
          <h2 style="color: #111; font-size: 18px; margin: 0 0 16px 0;">
            ${isApproved ? '✅ Pull Request Approved' : '❌ Changes Requested'}
          </h2>

          <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            Hi ${toName},
          </p>

          <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            ${
              isApproved
                ? `Your pull request${prNumber ? ` #${prNumber}` : ''} has been reviewed and <strong style="color: #059669;">approved</strong>. It is ready to merge.`
                : `Your pull request${prNumber ? ` #${prNumber}` : ''} has been reviewed. Your manager has <strong style="color: #dc2626;">requested changes</strong> before it can be merged.`
            }
          </p>

          ${
            feedback
              ? `
            <div style="background: white; border: 1px solid #e5e7eb; border-left: 4px solid ${isApproved ? '#059669' : '#dc2626'}; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.05em;">
                Manager Feedback
              </p>
              <p style="font-size: 14px; color: #111; margin: 0; line-height: 1.6;">
                ${feedback}
              </p>
            </div>
          `
              : ''
          }

          ${
            !isApproved
              ? `
            <div style="background: #fef2f2; border: 1px solid rgba(220,38,38,0.2); border-radius: 6px; padding: 14px; margin: 0 0 24px 0;">
              <p style="font-size: 13px; color: #dc2626; margin: 0;">
                ⚠️ Please fix the issues in your code and open a new pull request.
              </p>
            </div>
          `
              : ''
          }

          <a href="${process.env.FRONTEND_URL}/workspace/${workspaceId}"
             style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            View in CodeLens AI
          </a>

          <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0;">
            This notification was sent because you are a member of 
            a CodeLens AI workspace.
          </p>

        </div>
      </div>
    `

    try {
      const mailHeaders = buildMailHeaders(config, subject)

      const envelopeFrom = config.user || config.from || 'noreply@codelens.ai'

      const message = {
        from: mailHeaders.from,
        replyTo: mailHeaders.replyTo,
        envelope: {
          from: envelopeFrom,
          to: toEmail,
        },
        to: toEmail,
        subject: mailHeaders.subject,
        html,

      }

      let lastError = null
      for (const transportOptions of getTransportAttempts(config)) {
        try {
          await nodemailer.createTransport(transportOptions).sendMail(message)
          console.log(
            `[Email] Sent decision email to ${toEmail} via ${transportOptions.host}:${transportOptions.port}`
          )
          return true
        } catch (err) {
          lastError = err
          console.error(
            `[Email] SMTP attempt failed (${transportOptions.host}:${transportOptions.port}, secure=${transportOptions.secure}):`,
            err.message
          )
        }
      }

      throw lastError || new Error('SMTP send failed')
    } catch (err) {
      console.error('[Email] Failed to send:', err.message)
      // Do not throw — email failure should not break anything
      return false
    }
  },
}
