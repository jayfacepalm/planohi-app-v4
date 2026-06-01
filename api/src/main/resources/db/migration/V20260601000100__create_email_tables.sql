ALTER TABLE invitee ADD COLUMN email VARCHAR(255);

CREATE TABLE email_template (
    id VARCHAR(100) PRIMARY KEY,
    subject_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(100) NOT NULL REFERENCES email_template(id),
    recipient_tos TEXT NOT NULL,
    recipient_ccs TEXT,
    recipient_bccs TEXT,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    error_message TEXT,
    triggered_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Seed Cyberpunk HTML Templates
INSERT INTO email_template (id, subject_template, body_template, created_at, updated_at) VALUES 
('REGISTRATION_OTP', 'Verify your PLANO.HI Account', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your PLANO.HI Account</title>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="max-width:600px;margin:40px auto;padding:32px;background-color:#0d0d11;border:1px solid #1f1f29;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:bold;letter-spacing:2px;background:linear-gradient(90deg,#9333ea,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">PLANO.HI</span>
    </div>
    <h2 style="font-size:20px;font-weight:600;margin-top:0;margin-bottom:16px;color:#ffffff;text-align:center;">Security Verification</h2>
    <p style="font-size:15px;line-height:24px;color:#a1a1aa;margin-bottom:24px;text-align:center;">
      Thank you for registering an account on PLANO.HI. Use the following One-Time Password (OTP) to verify your email and complete your registration:
    </p>
    <div style="margin:32px 0;text-align:center;">
      <div style="display:inline-block;padding:16px 32px;background-color:#161622;border:1px solid #06b6d4;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:6px;color:#06b6d4;box-shadow:0 0 15px rgba(6,182,212,0.15);">
        ${otpCode}
      </div>
    </div>
    <p style="font-size:13px;line-height:20px;color:#71717a;margin-bottom:0;text-align:center;">
      This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.
    </p>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1a1a24;text-align:center;font-size:12px;color:#52525b;">
      &copy; 2026 PLANO.HI. Dynamic Event Management Canvas. All rights reserved.
    </div>
  </div>
</body>
</html>', NOW(), NOW()),

('GUEST_INVITATION', 'You are invited: ${eventName}!', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="max-width:600px;margin:40px auto;background-color:#0d0d11;border:1px solid #1f1f29;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    <div style="padding:32px;">
      <div style="margin-bottom:24px;">
        <span style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#9333ea;text-transform:uppercase;">Event Invitation</span>
        <h1 style="font-size:24px;font-weight:bold;margin-top:8px;margin-bottom:0;color:#ffffff;">${eventName}</h1>
      </div>
      
      <p style="font-size:15px;line-height:24px;color:#a1a1aa;margin-top:0;margin-bottom:20px;">
        Hello <strong>${inviteeName}</strong>,
      </p>
      <p style="font-size:15px;line-height:24px;color:#a1a1aa;margin-bottom:24px;">
        You have been invited to attend the event <strong>${eventName}</strong>. As our special guest, you are eligible to bring a party of up to <strong>${allowedGuests}</strong> guests (including yourself).
      </p>
      
      <!-- Call to Action RSVP Button -->
      <div style="margin:32px 0;text-align:center;">
        <a href="${rsvpLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg,#9333ea,#06b6d4);color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:8px;box-shadow:0 4px 15px rgba(147,51,234,0.3);">
          Submit RSVP Response
        </a>
      </div>
      
      <p style="font-size:13px;line-height:20px;color:#71717a;margin-bottom:0;text-align:center;background-color:#161622;padding:12px;border-radius:6px;border:1px solid #1f1f29;">
        Please click the button above to confirm your attendance and register headcount.
      </p>
      
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1a1a24;text-align:center;font-size:12px;color:#52525b;">
        &copy; 2026 PLANO.HI. Dynamic Event Management Canvas. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>', NOW(), NOW());
