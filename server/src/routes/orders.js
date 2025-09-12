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
		console.log('Creating order for video:', videoId);
		
		const video = await Video.findById(videoId);
		if (!video || !video.isActive) {
			console.log('Video not found or not active:', videoId);
			return res.status(404).json({ error: 'Video not found' });
		}
		
		console.log('Video found:', { id: video._id, price: video.priceINR });
		const instance = getRazorpay();
		const amount = Math.round(video.priceINR * 100);
		
		console.log('Creating Razorpay order with amount:', amount);
		const order = await instance.orders.create({ amount, currency: 'INR', receipt: `vid_${video._id}` });
		console.log('Razorpay order created:', order.id);
		
		const txn = await Transaction.create({
			userId: req.user.id,
			videoId: video._id,
			razorpayOrderId: order.id,
			amountINR: video.priceINR,
			status: 'created',
		});
		console.log('Transaction created:', txn._id);
		
		return res.json({ orderId: order.id, amount, currency: 'INR', txnId: txn._id });
	} catch (err) {
		console.error('Order creation failed:', err?.message || err);
		console.error('Full error:', err);
		return res.status(500).json({ error: 'Order creation failed', details: err?.message });
	}
});

router.post('/verify', authenticate, async (req, res) => {
	try {
		console.log('Payment verification request received:', req.body);
		
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature, videoId } = req.body;
		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !videoId) {
			console.error('Missing required fields:', { razorpay_order_id, razorpay_payment_id, razorpay_signature, videoId });
			return res.status(400).json({ error: 'Missing required fields' });
		}

		const secret = process.env.RAZORPAY_KEY_SECRET;
		if (!secret) {
			console.error('Razorpay secret key not found');
			return res.status(500).json({ error: 'Server configuration error' });
		}

		console.log('Verifying signature...');
		const expected = crypto
			.createHmac('sha256', secret)
			.update(razorpay_order_id + '|' + razorpay_payment_id)
			.digest('hex');
		
		if (expected !== razorpay_signature) {
			console.error('Signature mismatch:', { expected, received: razorpay_signature });
			return res.status(400).json({ error: 'Invalid signature' });
		}
		
		console.log('Signature verified, updating transaction...');
		const txn = await Transaction.findOneAndUpdate(
			{ razorpayOrderId: razorpay_order_id },
			{ status: 'paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
			{ new: true }
		);
		if (!txn) {
			console.error('Transaction not found:', razorpay_order_id);
			return res.status(404).json({ error: 'Transaction not found' });
		}

		console.log('Transaction updated, creating QR token...');
		const qr = await createQrToken({ userId: txn.userId, videoId, ttlMinutes: 60 * 24 * 7, maxDownloads: 5 }); // 7 days, 5 downloads
		
		if (!qr || !qr.token) {
			console.error('Failed to create QR token');
			return res.status(500).json({ error: 'Failed to create QR token' });
		}

		console.log('QR token created, sending email...');
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
			console.log('Email sent successfully');
		} catch (e) {
			console.error('Email sending failed:', e);
			// Best-effort email; continue
		}

		const response = {
			ok: true,
			token: qr.token,
			txn: txn._id,
			message: 'Payment verified successfully',
			expiresAt: qr.expiresAt,
			downloadsRemaining: qr.maxDownloads
		};

		console.log('Sending success response:', response);
		return res.json(response);
	} catch (err) {
		console.error('Verification failed:', err);
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
