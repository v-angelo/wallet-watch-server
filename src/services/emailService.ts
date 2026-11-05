import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetUrl: string,
): Promise<void> => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset Your WalletWatch Password",

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px;">
        <h2>WalletWatch Password Reset</h2>

        <p>We received a request to reset your WalletWatch password.</p>

        <p>Click the button below to create a new password:</p>

        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 24px;
            background-color: #c9961a;
            color: #171717;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          "
        >
          Reset Password
        </a>

        <p style="margin-top: 25px;">
          This link expires in 15 minutes.
        </p>

        <p>If you didn't request a password reset, you can safely ignore this email.</p>

        <p>Thanks,<br />WalletWatch Team</p>
      </div>
    `,
  });
};
