import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env.js";

/**
 * Lazy singleton transporter — created once on first use and reused on subsequent calls.
 * Avoids opening a new SMTP connection (or creating a new Ethereal account) per email.
 */
let _transporter: Transporter | null = null;
let _isEthereal = false;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (env.SMTP_HOST) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return _transporter;
  }

  // Development: create one Ethereal account and reuse it
  const testAccount = await nodemailer.createTestAccount();
  _isEthereal = true;
  _transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log(`[mailer] Using Ethereal test account: ${testAccount.user}`);
  return _transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: env.SMTP_FROM ?? `"Barbershop Pro" <noreply@barbershoppro.com>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (_isEthereal && env.NODE_ENV !== "production") {
    console.log(`[mailer] Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

export interface AppointmentEmailData {
  customerName: string;
  barberName: string;
  serviceName: string;
  appointmentDate: Date | string;
  durationMinutes: number;
  price: number;
}

export interface AppointmentCancellationData {
  customerName: string;
  barberName: string;
  serviceName: string;
  appointmentDate: Date | string;
  reason?: string;
}

function formatAppointmentDate(date: Date | string): string {
  return new Date(date).toLocaleString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildAppointmentConfirmationEmail(data: AppointmentEmailData): string {
  const dateStr = formatAppointmentDate(data.appointmentDate);
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif;">
      <div style="max-width:480px;margin:40px auto;padding:0 16px;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;width:48px;height:48px;background:#16a34a;border-radius:12px;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:24px;">✓</span>
            </div>
            <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:12px 0 4px;">Cita Confirmada</h1>
            <p style="color:#71717a;font-size:13px;margin:0;">Barbershop Pro</p>
          </div>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Hola, <strong style="color:#f4f4f5;">${data.customerName}</strong>. Tu cita ha sido confirmada.
          </p>
          <div style="background:#27272a;border-radius:12px;padding:16px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Servicio</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${data.serviceName}</td>
              </tr>
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Barbero</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${data.barberName}</td>
              </tr>
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Fecha y hora</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${dateStr}</td>
              </tr>
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Duración</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${data.durationMinutes} min</td>
              </tr>
              <tr style="border-top:1px solid #3f3f46;">
                <td style="color:#71717a;font-size:14px;padding:10px 0 6px;font-weight:600;">Total</td>
                <td style="color:#4ade80;font-size:16px;font-weight:700;text-align:right;padding:10px 0 6px;">S/. ${data.price.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <p style="color:#52525b;font-size:12px;line-height:1.6;margin:0;">
            Si necesitas cancelar o reprogramar, contáctanos con anticipación.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildAppointmentCancellationEmail(data: AppointmentCancellationData): string {
  const dateStr = formatAppointmentDate(data.appointmentDate);
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif;">
      <div style="max-width:480px;margin:40px auto;padding:0 16px;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;width:48px;height:48px;background:#dc2626;border-radius:12px;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:24px;">✗</span>
            </div>
            <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:12px 0 4px;">Cita Cancelada</h1>
          </div>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Hola, <strong style="color:#f4f4f5;">${data.customerName}</strong>. Tu cita ha sido cancelada.
          </p>
          <div style="background:#27272a;border-radius:12px;padding:16px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Servicio</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${data.serviceName}</td>
              </tr>
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Barbero</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${data.barberName}</td>
              </tr>
              <tr>
                <td style="color:#71717a;font-size:13px;padding:6px 0;">Fecha</td>
                <td style="color:#f4f4f5;font-size:13px;font-weight:600;text-align:right;">${dateStr}</td>
              </tr>
              ${data.reason ? `<tr><td style="color:#71717a;font-size:13px;padding:6px 0;">Motivo</td><td style="color:#f4f4f5;font-size:13px;text-align:right;">${data.reason}</td></tr>` : ""}
            </table>
          </div>
          <p style="color:#52525b;font-size:12px;line-height:1.6;margin:0;">
            Puedes agendar una nueva cita cuando lo desees.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildPasswordResetEmail(resetUrl: string, userName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif;">
      <div style="max-width:480px;margin:40px auto;padding:0 16px;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">

          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;width:48px;height:48px;background:#4f46e5;border-radius:12px;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:24px;">✂</span>
            </div>
            <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:12px 0 4px;">Barbershop Pro</h1>
            <p style="color:#71717a;font-size:13px;margin:0;">Recuperación de contraseña</p>
          </div>

          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 8px;">Hola, <strong style="color:#f4f4f5;">${userName}</strong></p>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar.
            Este enlace expira en <strong style="color:#f4f4f5;">60 minutos</strong>.
          </p>

          <a href="${resetUrl}"
             style="display:block;background:#4f46e5;color:#fff;text-align:center;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:24px;">
            Restablecer contraseña
          </a>

          <p style="color:#52525b;font-size:12px;line-height:1.6;margin:0;">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
