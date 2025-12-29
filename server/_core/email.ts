import { ENV } from "./env";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

function isEmailEnabled() {
  return Boolean(ENV.resendApiKey && ENV.emailFrom && ENV.appBaseUrl);
}

async function sendWithResend(payload: EmailPayload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend error: ${response.status} ${text}`);
  }
}

export async function sendEmail(payload: EmailPayload) {
  if (!isEmailEnabled()) {
    console.warn("[Email] Not configured, skipping send", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  await sendWithResend(payload);
}

export function buildInviteEmail({
  organizationName,
  invitedBy,
  inviteUrl,
}: {
  organizationName: string;
  invitedBy: string;
  inviteUrl: string;
}) {
  return {
    subject: `You have been invited to ${organizationName} on Nexora CRM`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
        <div style="display:none;max-height:0;overflow:hidden;">
          You have been invited to ${organizationName} on Nexora CRM.
        </div>
        <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">Nexora CRM</p>
        <h2 style="margin: 0 0 8px; font-size: 22px;">You're invited</h2>
        <p style="margin: 0 0 14px;">${invitedBy} invited you to join <strong>${organizationName}</strong>.</p>
        <p style="margin: 0 0 18px;">Set your password to activate your account:</p>
        <p style="margin: 0 0 18px;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 18px; background: #14b8a6; color: #0f172a; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept invite</a>
        </p>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">If the button does not work, copy and paste this link:</p>
        <p style="margin: 0 0 18px; font-size: 12px; color: #0f172a;">${inviteUrl}</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">If you did not expect this invitation, you can ignore this email.</p>
      </div>
    `,
  };
}

export function buildPasswordResetEmail({
  resetUrl,
}: {
  resetUrl: string;
}) {
  return {
    subject: "Reset your Nexora CRM password",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
        <div style="display:none;max-height:0;overflow:hidden;">
          Reset your Nexora CRM password.
        </div>
        <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">Nexora CRM</p>
        <h2 style="margin: 0 0 8px; font-size: 22px;">Reset your password</h2>
        <p style="margin: 0 0 18px;">We received a request to reset your Nexora CRM password.</p>
        <p style="margin: 0 0 18px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #38bdf8; color: #0f172a; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset password</a>
        </p>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">If the button does not work, copy and paste this link:</p>
        <p style="margin: 0 0 18px; font-size: 12px; color: #0f172a;">${resetUrl}</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}
