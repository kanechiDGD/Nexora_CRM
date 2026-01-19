import { ENV } from "./env";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const EMAIL_WITH_NAME_REGEX = /^[^<>"]+\s*<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;
const EMAIL_ONLY_REGEX = /^[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+$/;

const isValidEmailFrom = (value: string) =>
  EMAIL_ONLY_REGEX.test(value) || EMAIL_WITH_NAME_REGEX.test(value);

const htmlToText = (html: string) => {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<\/div\s*>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, " ");
  return stripped
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

function isEmailEnabled() {
  return Boolean(ENV.resendApiKey && ENV.emailFrom && ENV.appBaseUrl);
}

async function sendWithResend(payload: EmailPayload) {
  const from = ENV.emailFrom.trim();
  if (!isValidEmailFrom(from)) {
    throw new Error(`Invalid EMAIL_FROM format: ${ENV.emailFrom}`);
  }

  const replyTo = ENV.emailReplyTo.trim();
  if (replyTo && !isValidEmailFrom(replyTo)) {
    throw new Error(`Invalid EMAIL_REPLY_TO format: ${ENV.emailReplyTo}`);
  }

  const text = payload.text?.trim() || htmlToText(payload.html) || payload.subject;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
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
  const year = new Date().getFullYear();
  return {
    subject: `Valkira CRM - Invitation from ${invitedBy} to join ${organizationName}`,
    html: `
      <div style="background: #F8FAFC; padding: 24px 0; font-family: Arial, Helvetica, sans-serif; color: #0F172A; line-height: 1.5;">
        <div style="display:none;max-height:0;overflow:hidden;">
          ${invitedBy} invited you to join ${organizationName}. Accept to activate your account.
        </div>
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #475569; font-weight: 700;">Valkira CRM</p>
          <h2 style="margin: 0 0 10px; font-size: 22px; color: #0F172A; font-weight: 700;">
            Invitation to join ${organizationName}
          </h2>
          <p style="margin: 0 0 6px; font-size: 14px; color: #0F172A;">
            ${invitedBy} invited you to join ${organizationName} on Valkira CRM.
          </p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #475569;">
            To activate your account, accept the invitation using the button below.
          </p>
          <div style="text-align: center; margin: 0 0 10px;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 18px; background: #0EA5A4; color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: 700;">
              Accept invitation
            </a>
          </div>
          <p style="margin: 0 0 18px; font-size: 12px; color: #475569; text-align: center;">
            If you did not request this, do not click.
          </p>
          <p style="margin: 0 0 6px; font-size: 12px; color: #475569;">
            If the button does not work, open this link:
          </p>
          <p style="margin: 0 0 6px; font-size: 12px;">
            <a href="https://www.valkiracrm.com/invite" style="color: #2563EB; text-decoration: none;">
              https://www.valkiracrm.com/invite
            </a>
          </p>
          <p style="margin: 0 0 18px; font-size: 12px; color: #475569;">
            Then sign in and check your pending invitations.
          </p>
          <p style="margin: 0 0 18px; font-size: 12px; color: #475569;">
            Did not expect this invitation? You can ignore this email. No account will be activated without your action.
          </p>
        </div>
        <div style="max-width: 600px; margin: 18px auto 0; text-align: center; color: #64748B; font-size: 11px;">
          <div>Support: support@valkiracrm.com</div>
          <div>&copy; ${year} Valkira CRM</div>
        </div>
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
    subject: "Reset your Valkira CRM password",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
        <div style="display:none;max-height:0;overflow:hidden;">
          Reset your Valkira CRM password.
        </div>
        <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">Valkira CRM</p>
        <h2 style="margin: 0 0 8px; font-size: 22px;">Reset your password</h2>
        <p style="margin: 0 0 18px;">We received a request to reset your Valkira CRM password.</p>
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
