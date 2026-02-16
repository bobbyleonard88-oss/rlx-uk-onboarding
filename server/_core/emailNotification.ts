import { ENV } from "./env";

const ADMIN_EMAIL = "clientsuccess@recruitmentevents.co";

interface EmailNotificationParams {
  subject: string;
  htmlBody: string;
}

/**
 * Send email notification to admin team
 * Uses the Manus notification API to send emails
 */
export async function sendAdminEmail({
  subject,
  htmlBody,
}: EmailNotificationParams): Promise<boolean> {
  try {
    const response = await fetch(`${ENV.forgeApiUrl}/notification/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        to: ADMIN_EMAIL,
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send admin email:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending admin email:", error);
    return false;
  }
}

/**
 * Send notification when sponsor submits intake form
 */
export async function notifyIntakeSubmission(
  sponsorName: string,
  sponsorId: number,
  dashboardUrl: string
): Promise<boolean> {
  const subject = `New Intake Form Submission - ${sponsorName}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 New Intake Form Submission</h1>
      </div>
      <div class="content">
        <p>Hi Team,</p>
        <p>A sponsor has just completed their intake form for the RLX event.</p>
        
        <div class="info-box">
          <strong>Sponsor:</strong> ${sponsorName}<br>
          <strong>Submission Time:</strong> ${new Date().toLocaleString('en-GB', { 
            dateStyle: 'full', 
            timeStyle: 'short' 
          })}
        </div>
        
        <p>You can review their submission and profile details using the link below:</p>
        
        <a href="${dashboardUrl}" class="button">Review Submission</a>
        
        <div class="footer">
          <p>RLX Onboarding Platform<br>
          Automated notification - please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendAdminEmail({ subject, htmlBody });
}

/**
 * Send notification when sponsor submits rankings
 */
export async function notifyRankingsSubmission(
  sponsorName: string,
  sponsorId: number,
  dashboardUrl: string
): Promise<boolean> {
  const subject = `New Rankings Submission - ${sponsorName}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⭐ New Rankings Submission</h1>
      </div>
      <div class="content">
        <p>Hi Team,</p>
        <p>A sponsor has completed their delegate rankings for the RLX event.</p>
        
        <div class="info-box">
          <strong>Sponsor:</strong> ${sponsorName}<br>
          <strong>Submission Time:</strong> ${new Date().toLocaleString('en-GB', { 
            dateStyle: 'full', 
            timeStyle: 'short' 
          })}
        </div>
        
        <p>You can review their rankings and generate meetings using the link below:</p>
        
        <a href="${dashboardUrl}" class="button">Review Rankings</a>
        
        <div class="footer">
          <p>RLX Onboarding Platform<br>
          Automated notification - please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendAdminEmail({ subject, htmlBody });
}
