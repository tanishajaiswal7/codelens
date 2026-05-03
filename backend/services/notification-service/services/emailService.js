import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export const emailService = {
  async sendWorkspaceInviteEmail({
    toEmail,
    workspaceName,
    inviteUrl,
  }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('[Email] Not configured — invite email skipped')
      return
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
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: `You have been invited to ${workspaceName} on CodeLens AI`,
        html,
      })
      console.log(`[Email] Invite sent to ${toEmail}`)
    } catch (err) {
      console.error('[Email] Invite email failed:', err.message)
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
    // Only send if email config exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('[Email] Email not configured — skipping')
      return
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
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject,
        html,
      })
      console.log(`[Email] Sent decision email to ${toEmail}`)
    } catch (err) {
      console.error('[Email] Failed to send:', err.message)
      // Do not throw — email failure should not break anything
    }
  },
}
