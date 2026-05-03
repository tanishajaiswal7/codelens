import axios from 'axios'

const getMailConfig = () => ({
  from: process.env.EMAIL_FROM,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
})

const buildPlainTextInvite = (workspaceName, inviteUrl) => (
  `You have been invited to join ${workspaceName} on CodeLens AI.\n\n` +
  `Open this link to join the workspace:\n${inviteUrl}\n\n` +
  'This invite expires in 7 days.'
)

const getHttpErrorDetails = (err) => {
  if (!err) return ''
  if (err.response?.data) {
    try {
      return JSON.stringify(err.response.data)
    } catch {
      return String(err.response.data)
    }
  }
  return err.message || String(err)
}

const sendViaSendGrid = async (config, { toEmail, subject, html, text }) => {
  if (!config.sendgridApiKey) return false

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
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
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

export const emailService = {
  async sendWorkspaceInviteEmail({
    toEmail,
    workspaceName,
    inviteUrl,
  }) {
    const config = getMailConfig()
    if (!config.sendgridApiKey || !config.from) {
      console.log('[Email] SendGrid not configured — invite email skipped')
      return false
        subject: `You have been invited to ${workspaceName} on CodeLens AI`,
        html: buildInviteHtml(workspaceName, inviteUrl),
        text: buildPlainTextInvite(workspaceName, inviteUrl),
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
      await sendViaSendGrid(config, {
        toEmail,
        subject: `You have been invited to ${workspaceName} on CodeLens AI`,
        html: buildInviteHtml(workspaceName, inviteUrl),
        text: buildPlainTextInvite(workspaceName, inviteUrl),
      })
      return true
    } catch (err) {
      console.error('[Email] Invite email failed:', getHttpErrorDetails(err))
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
    if (!config.sendgridApiKey || !config.from) {
      console.log('[Email] SendGrid not configured — skipping')
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
      await sendViaSendGrid(config, {
        toEmail,
        subject,
        html,
        text: `Hi ${toName}, ${isApproved ? 'your pull request was approved.' : 'changes were requested on your pull request.'} View CodeLens AI at ${process.env.FRONTEND_URL}/workspace/${workspaceId}`,
      })
      console.log(`[Email] Sent decision email to ${toEmail}`)
      return true
    } catch (err) {
      console.error('[Email] Failed to send:', getHttpErrorDetails(err))
      // Do not throw — email failure should not break anything
      return false
    }
  },
}
