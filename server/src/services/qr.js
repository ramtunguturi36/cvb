import crypto from 'crypto';
import QRCode from 'qrcode';
import { QRToken } from '../models/QRToken.js';

export async function createQrToken({ userId, videoId, ttlMinutes = 60, maxDownloads = 1 }) {
	const token = crypto.randomBytes(24).toString('hex');
	const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
	const qr = await QRToken.create({ userId, videoId, token, expiresAt, maxDownloads });
	return qr;
}

export async function generateQRCode(token) {
	try {
		const qrCodeDataURL = await QRCode.toDataURL(token, {
			width: 200,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#FFFFFF'
			}
		});
		return qrCodeDataURL;
	} catch (err) {
		console.error('QR Code generation failed:', err);
		throw new Error('Failed to generate QR code');
	}
}

export async function verifyQrToken(token) {
	const qr = await QRToken.findOne({ token });
	if (!qr || qr.isRevoked) return { ok: false, reason: 'invalid' };
	if (qr.expiresAt < new Date()) return { ok: false, reason: 'expired' };
	if (qr.downloadCount >= qr.maxDownloads) return { ok: false, reason: 'limit' };
	return { ok: true, qr };
}

export async function consumeQrToken(token) {
	const result = await QRToken.findOneAndUpdate(
		{ token, isRevoked: false, expiresAt: { $gt: new Date() } },
		{ $inc: { downloadCount: 1 } },
		{ new: true }
	);
	return result;
}
