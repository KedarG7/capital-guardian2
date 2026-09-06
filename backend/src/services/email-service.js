import nodemailer from 'nodemailer'

export async function sendOtpEmail(email, code) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.SMTP_FROM) {
    throw new Error('SMTP is not configured.')
  }
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
  await transport.sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'Your Capital Guardian verification code', text: `Your Capital Guardian verification code is ${code}. It expires in 10 minutes. Do not share this code.` })
}
