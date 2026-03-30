// ============================================
// RESEND - Integração para envio de emails
// ============================================
// 
// Para ativar, configure as variáveis de ambiente:
//   VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
//   VITE_RESEND_FROM_EMAIL=noreply@seudominio.com
//
// Documentação: https://resend.com/docs
// ============================================

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || ''
const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export const isResendConfigured = !!RESEND_API_KEY && RESEND_API_KEY !== ''

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!isResendConfigured) {
    console.warn('[Resend] API key não configurada. Email não enviado.')
    return { error: 'Resend não configurado' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Resend] Erro ao enviar email:', error)
      return { error: error.message || 'Erro ao enviar email' }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    console.error('[Resend] Erro:', err)
    return { error: 'Erro de conexão' }
  }
}

// Templates de email prontos para uso
export const emailTemplates = {
  bemVindo: (nome: string) => ({
    subject: 'Bem-vindo ao Max Control! 🚗',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #3657a3; padding: 16px 24px; border-radius: 16px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">Max Control</span>
          </div>
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Olá, ${nome}! 👋</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Seja bem-vindo ao <strong>Max Control</strong>! Sua conta foi criada com sucesso.
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Agora você pode gerenciar seus agendamentos, clientes, vendas e serviços em um só lugar.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${typeof window !== 'undefined' ? window.location.origin : ''}" style="display: inline-block; background: #3657a3; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Acessar minha conta
          </a>
        </div>
        <p style="color: #999; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          Max Control - Estética Automotiva
        </p>
      </div>
    `,
  }),

  recuperarSenha: (link: string) => ({
    subject: 'Recuperar senha - Max Control',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #3657a3; padding: 16px 24px; border-radius: 16px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">Max Control</span>
          </div>
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Recuperar senha 🔒</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="display: inline-block; background: #3657a3; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Redefinir minha senha
          </a>
        </div>
        <p style="color: #999; font-size: 14px; line-height: 1.6;">
          Se você não solicitou esta alteração, ignore este email. O link expira em 24 horas.
        </p>
        <p style="color: #999; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          Max Control - Estética Automotiva
        </p>
      </div>
    `,
  }),

  lembrete: (nome: string, servico: string, data: string) => ({
    subject: `Lembrete: ${servico} amanhã! - Max Control`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #3657a3; padding: 16px 24px; border-radius: 16px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">Max Control</span>
          </div>
        </div>
        <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Olá, ${nome}! 📅</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Este é um lembrete do seu agendamento:
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #3657a3;">
          <p style="color: #333; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">${servico}</p>
          <p style="color: #666; font-size: 14px; margin: 0;">${data}</p>
        </div>
        <p style="color: #999; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          Max Control - Estética Automotiva
        </p>
      </div>
    `,
  }),
}
