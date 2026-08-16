/* =============================================================================
   Zeno Email Service — Multi-Transport (Google OAuth 2.0, SMTP, Dev Console Fallback)
   ============================================================================= */

const nodemailer = require('nodemailer');

// Conditionally load googleapis only if available
let google = null;
try { google = require('googleapis').google; } catch (_) {}

class EmailService {
  hasGoogleOAuth() {
    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    return Boolean(google && clientId && clientSecret && refreshToken &&
      clientId !== 'your_google_client_id_here' &&
      clientSecret !== 'your_google_client_secret_here' &&
      refreshToken !== 'your_google_refresh_token_here');
  }

  hasStandardSMTP() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return Boolean(user && pass &&
      user !== 'your_smtp_user_here' &&
      pass !== 'your_smtp_pass_here');
  }

  async createTransporter() {
    // 1. Google OAuth 2.0 Mode
    if (this.hasGoogleOAuth()) {
      const clientId     = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri  = process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      const userEmail    = process.env.GOOGLE_USER_EMAIL || process.env.SMTP_FROM_EMAIL || '';

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      let accessToken = null;
      try {
        const tokenRes = await oauth2Client.getAccessToken();
        accessToken = tokenRes && tokenRes.token ? tokenRes.token : tokenRes;
      } catch (authErr) {
        const errDetail = authErr.response && authErr.response.data
          ? JSON.stringify(authErr.response.data)
          : authErr.message;
        throw new Error(`Google OAuth2 authentication failed: ${errDetail}`);
      }

      const senderUser = userEmail || 'me';
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: senderUser,
          clientId,
          clientSecret,
          refreshToken,
          accessToken
        }
      });

      const from = senderUser !== 'me'
        ? `"Zeno AI Assistant" <${senderUser}>`
        : '"Zeno AI Assistant" <noreply@zeno.ai>';
      return { transporter, senderAddress: from, mode: 'oauth2' };
    }

    // 2. Standard Gmail / SMTP Password Mode
    if (this.hasStandardSMTP()) {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.SMTP_PORT || '587');
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || `"Zeno AI Assistant" <${user}>`;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      return { transporter, senderAddress: from, mode: 'smtp' };
    }

    // 3. Dev Console Mode — no external network calls, OTP shown in terminal + API response
    return { transporter: null, senderAddress: null, mode: 'dev' };
  }

  async sendOTPEmail(recipientEmail, otpCode, expiresInMinutes = 5) {
    const { transporter, senderAddress, mode } = await this.createTransporter();

    if (mode === 'dev') {
      // No email sent — OTP is returned in the API response for dev testing
      console.log('\n========================================');
      console.log('[ZENO DEV MODE — NO EMAIL CONFIGURED]');
      console.log(`Recipient: ${recipientEmail}`);
      console.log(`OTP Code:  ${otpCode}   ← use this to verify`);
      console.log(`Expires:   in ${expiresInMinutes} minutes`);
      console.log('========================================\n');
      return {
        success: true,
        messageId: 'dev-mode',
        previewUrl: null,
        devOtp: otpCode   // returned to frontend only in dev mode
      };
    }

    const mailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0e1a; color: #ffffff; padding: 36px 28px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 26px; font-weight: 800; color: #ff6b00; margin: 0; letter-spacing: -0.5px;">Zeno AI</h1>
          <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px;">Intelligent Workspace Security</p>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center;">Verify Your Email Address</h2>
        <p style="font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.75); margin-bottom: 24px; text-align: center;">
          Use the following 4-digit verification code to authenticate your sign-in to Zeno AI.
        </p>
        <div style="background: rgba(255, 107, 0, 0.08); border: 2px solid #ff6b00; border-radius: 14px; padding: 18px; text-align: center; margin: 0 auto 24px auto; max-width: 280px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #ff6b00; display: inline-block; padding-left: 12px;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.6); text-align: center; margin-bottom: 20px;">
          ⏱️ This code will expire in <strong>${expiresInMinutes} minutes</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
        <p style="font-size: 11px; line-height: 1.5; color: rgba(255,255,255,0.4); text-align: center; margin: 0;">
          If you did not request this verification code, you can safely ignore this email.
        </p>
      </div>
    `;

    const mailOptions = {
      from: senderAddress,
      to: recipientEmail,
      subject: `Your Zeno Verification Code is ${otpCode}`,
      html: mailHtml,
      text: `Your Zeno AI verification code is ${otpCode}. It will expire in ${expiresInMinutes} minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Mode: ${mode} | To: ${recipientEmail} | ID: ${info.messageId}`);

    return { success: true, messageId: info.messageId, previewUrl: null };
  }
}

module.exports = new EmailService();
