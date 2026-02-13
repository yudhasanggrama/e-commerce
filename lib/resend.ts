import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendOrderEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.EMAIL_FROM!;
  return resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export function paidEmailTemplate(args: { orderId: string; total: number; appUrl: string }) {
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <h2>Payment Success ✅</h2>
    <p>Order kamu sudah dibayar.</p>
    <p><b>Order ID:</b> ${args.orderId}</p>
    <p><b>Total:</b> Rp ${args.total.toLocaleString("id-ID")}</p>
    <p><a href="${args.appUrl}/orders/${args.orderId}/confirmation">Lihat status order</a></p>
  </div>`;
}

export function failedEmailTemplate(args: { orderId: string; reason: string; appUrl: string }) {
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <h2>Pembayaran gagal / expired</h2>
    <p><b>Order ID:</b> ${args.orderId}</p>
    <p><b>Reason:</b> ${args.reason}</p>
    <p><a href="${args.appUrl}/orders/${args.orderId}/confirmation">Buka order</a></p>
  </div>`;
}

export function shippedEmailTemplate(args: { orderId: string; appUrl: string }) {
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <h2>Order dikirim 🚚</h2>
    <p>Order <b>${args.orderId}</b> sudah dikirim.</p>
    <p><a href="${args.appUrl}/orders/${args.orderId}/confirmation">Lihat status</a></p>
  </div>`;
}