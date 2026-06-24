import { Resend } from 'resend'
import { env } from '../config/env'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetLink = `devclone://reset-password?token=${token}`

  await resend.emails.send({
    from: 'DevClone <noreply@devclone.com.br>',
    to,
    subject: 'Recuperação de senha — DevClone',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Recuperar senha</h2>
        <p>Você solicitou a recuperação de senha da sua conta DevClone.</p>
        <p>Clique no botão abaixo para definir uma nova senha. O link expira em <strong>1 hora</strong>.</p>
        <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Redefinir senha
        </a>
        <p style="color: #6b7280; font-size: 14px;">Se você não solicitou isso, ignore este email.</p>
      </div>
    `,
  })
}
