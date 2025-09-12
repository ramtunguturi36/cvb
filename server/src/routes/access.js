import { Router } from 'express';
import { verifyQrToken, consumeQrToken, generateQRCode } from '../services/qr.js';
import { authenticate } from '../utils/auth.js';
import { QRToken } from '../models/QRToken.js';
import { Video } from '../models/Video.js';

const router = Router();

router.post('/verify', async (req, res) => {
	const { token } = req.body;
	const check = await verifyQrToken(token);
	if (!check.ok) return res.status(400).json({ error: check.reason });
	const video = await Video.findById(check.qr.videoId).select('fileUrl title');
	return res.json({ ok: true, video });
});

router.post('/consume', async (req, res) => {
	const { token } = req.body;
	const updated = await consumeQrToken(token);
	if (!updated) return res.status(400).json({ error: 'invalid' });
	return res.json({ ok: true, remaining: Math.max(0, updated.maxDownloads - updated.downloadCount) });
});

router.get('/qr/:token', async (req, res) => {
	try {
		const { token } = req.params;
		const qrCodeDataURL = await generateQRCode(token);
		
		// Return the QR code as JSON with the data URL
		return res.json({ 
			qrCode: qrCodeDataURL,
			token: token
		});
	} catch (err) {
		return res.status(500).json({ error: 'Failed to generate QR code' });
	}
});

// List current user's QR tokens (active and recent)
router.get('/my-qr', authenticate, async (req, res) => {
    try {
        const tokens = await QRToken.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .select('token videoId expiresAt maxDownloads downloadCount isRevoked createdAt')
            .populate('videoId', 'title fileUrl');
        return res.json({ items: tokens });
    } catch (err) {
        console.error('Fetch my-qr failed:', err?.message || err);
        return res.status(500).json({ error: 'Failed to fetch QR tokens' });
    }
});

export default router;
