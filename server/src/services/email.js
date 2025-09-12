import nodemailer from 'nodemailer';

function getTransport() {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	if (!host || !user || !pass) throw new Error('Missing SMTP config');
	return nodemailer.createTransport({ host, port, auth: { user, pass } });
}

export async function sendQrEmail({ to, subject = 'Your video access QR', html }) {
	const from = process.env.FROM_EMAIL || 'no-reply@example.com';
	const transporter = getTransport();
	await transporter.sendMail({ from, to, subject, html });
}
