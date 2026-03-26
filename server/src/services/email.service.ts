// ===== Email Service =====
import { config } from '../config';

interface SendEmailResult {
  success: boolean;
  message: string;
  /** 开发模式下直接返回验证码，前端可展示给用户 */
  devCode?: string;
}

/**
 * 发送邮箱验证码
 * 开发模式：不真正发送邮件，返回验证码供前端显示
 * 生产模式：使用 SMTP 发送邮件（需配置环境变量）
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  purpose: 'register' | 'reset' = 'register'
): Promise<SendEmailResult> {
  const subjectMap = {
    register: 'DramaFlix - Email Verification Code',
    reset: 'DramaFlix - Password Reset Code',
  };

  if (config.isDev) {
    // 开发模式：直接返回验证码，不发送邮件
    console.log(`[DEV] 邮箱验证码: ${email} -> ${code} (${purpose})`);
    return {
      success: true,
      message: '验证码已生成',
      devCode: code,
    };
  }

  // 生产模式：使用 nodemailer 发送
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'DramaFlix'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subjectMap[purpose],
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.`,
      html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #6750A4;">DramaFlix</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #6750A4; letter-spacing: 4px; padding: 16px 0;">
            ${code}
          </div>
          <p style="color: #666;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });

    return { success: true, message: '验证码已发送到您的邮箱' };
  } catch (err: any) {
    console.error('邮件发送失败:', err.message);
    return { success: false, message: '邮件发送失败，请稍后再试' };
  }
}
