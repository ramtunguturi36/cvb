import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { authenticate } from '../utils/auth.js';
import { Video } from '../models/Video.js';
import { Transaction } from '../models/Transaction.js';
import { createQrToken } from '../services/qr.js';
import { sendQrEmail } from '../services/email.js';

const router = Router();

function getRazorpay() {
	const key_id = process.env.RAZORPAY_KEY_ID;
	const key_secret = process.env.RAZORPAY_KEY_SECRET;
	if (!key_id || !key_secret) {
		throw new Error('Missing Razorpay keys: ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set');
	}
	return new Razorpay({ key_id, key_secret });
}

router.post('/create', authenticate, async (req, res) => {
	try {
		const { videoId } = req.body;
		const video = await Video.findById(videoId);
		if (!video || !video.isActive) return res.status(404).json({ error: 'Video not found' });
		const instance = getRazorpay();
		const amount = Math.round(video.priceINR * 100);
		const order = await instance.orders.create({ amount, currency: 'INR', receipt: `vid_${video._id}` });
		const txn = await Transaction.create({
			userId: req.user.id,
			videoId: video._id,
			razorpayOrderId: order.id,
			amountINR: video.priceINR,
			status: 'created',
		});
		return res.json({ orderId: order.id, amount, currency: 'INR', txnId: txn._id });
	} catch (err) {
		console.error('Order creation failed:', err?.message || err);
		return res.status(500).json({ error: 'Order creation failed' });
	}
});

router.post('/verify', authenticate, async (req, res) => {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, videoId } = req.body;
		const secret = process.env.RAZORPAY_KEY_SECRET;
		const expected = crypto
			.createHmac('sha256', secret)
			.update(razorpay_order_id + '|' + razorpay_payment_id)
			.digest('hex');
		if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
		const txn = await Transaction.findOneAndUpdate(
			{ razorpayOrderId: razorpay_order_id },
			{ status: 'paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
			{ new: true }
		);
		const qr = await createQrToken({ userId: txn.userId, videoId, ttlMinutes: 60 * 24 * 7, maxDownloads: 5 }); // 7 days, 5 downloads
		try {
			await sendQrEmail({
				to: req.user.email,
				html: `
					<h2>Payment Successful!</h2>
					<p>Your video purchase has been confirmed.</p>
					<p><strong>QR Token:</strong> ${qr.token}</p>
					<p><strong>Expires:</strong> ${qr.expiresAt.toLocaleDateString()}</p>
					<p><strong>Downloads Remaining:</strong> ${qr.maxDownloads}</p>
					<p>Use this token to access your purchased video.</p>
				`,
			});
		} catch (e) {
			console.error('Email sending failed:', e);
			// Best-effort email; continue
		}
		return res.json({ 
			ok: true, 
			token: qr.token, 
			expiresAt: qr.expiresAt,
			downloadsRemaining: qr.maxDownloads
		});
	} catch (err) {
		return res.status(500).json({ error: 'Verification failed' });
	}
});

// Get current user's purchase transactions
router.get('/my-transactions', authenticate, async (req, res) => {
    try {
        const items = await Transaction.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('videoId', 'title priceINR fileUrl');
        return res.json({ items });
    } catch (err) {
        console.error('Fetch my-transactions failed:', err?.message || err);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

export default router;
