import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Video } from '../models/Video.js';
import { Transaction } from '../models/Transaction.js';
import { QRToken } from '../models/QRToken.js';
import { authenticate, requireAdmin } from '../utils/auth.js';
import { createQrToken } from '../services/qr.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		// Use absolute path for uploads directory
		const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
		console.log('Upload directory:', uploadDir);
		
		// Create directory if it doesn't exist
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		
		// Verify directory exists after creation
		if (fs.existsSync(uploadDir)) {
			console.log('Upload directory created/exists');
		} else {
			console.log('Failed to create upload directory');
		}
		
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
		console.log('Generated filename:', filename);
		cb(null, filename);
	}
});

const upload = multer({ 
	storage: storage,
	limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
	fileFilter: (req, file, cb) => {
		if (file.fieldname === 'previewFile' && file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else if (file.fieldname === 'fullFile' && file.mimetype.startsWith('video/')) {
			cb(null, true);
		} else {
			cb(new Error('QR code must be an image file and full video must be a video file'), false);
		}
	}
});

router.get('/feed', async (req, res) => {
	const page = Number(req.query.page || 1);
	const limit = Number(req.query.limit || 10);
	const skip = (page - 1) * limit;
	const q = (req.query.q || '').toString().trim();
	const filter = { isActive: true };
	if (q) {
		const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		filter.$or = [
			{ title: regex },
			{ description: regex },
			{ folder: regex },
		];
	}
	const [items, total] = await Promise.all([
		Video.find(filter)
			.sort({ _id: -1, createdAt: -1 }) // Add _id to ensure consistent ordering
			.skip(skip)
			.limit(limit)
			.select('_id title description thumbnailUrl fileUrl priceINR createdAt'),
		Video.countDocuments(filter),
	]);
	return res.json({ items, page, total, hasMore: skip + items.length < total });
});

// Get user's purchased videos
router.get('/purchased', authenticate, async (req, res) => {
	try {
		// Get all paid transactions for the user
		const transactions = await Transaction.find({ 
			userId: req.user.id, 
			status: 'paid' 
		}).populate('videoId', 'title description fileUrl thumbnailUrl priceINR createdAt');
		
		// Get unique video IDs from transactions
		const videoIds = [...new Set(transactions.map(t => t.videoId._id.toString()))];
		
		// Get videos with their QR tokens
		const videos = await Video.find({ 
			_id: { $in: videoIds },
			isActive: true 
		}).select('_id title description fileUrl thumbnailUrl priceINR createdAt');
		
		// Get QR tokens for these videos
		const qrTokens = await QRToken.find({ 
			userId: req.user.id, 
			videoId: { $in: videoIds },
			isRevoked: false,
			expiresAt: { $gt: new Date() }
		}).select('token videoId expiresAt maxDownloads downloadCount');
		
		// Combine videos with their QR tokens
		const videosWithTokens = videos.map(video => {
			const videoQrTokens = qrTokens.filter(qr => qr.videoId.toString() === video._id.toString());
			return {
				...video.toObject(),
				qrTokens: videoQrTokens,
				purchaseDate: transactions.find(t => t.videoId._id.toString() === video._id.toString())?.createdAt
			};
		});
		
		return res.json({ items: videosWithTokens });
	} catch (err) {
		console.error('Fetch purchased videos failed:', err?.message || err);
		return res.status(500).json({ error: 'Failed to fetch purchased videos' });
	}
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
	try {
		const video = await Video.create(req.body);
		return res.status(201).json(video);
	} catch (err) {
		return res.status(400).json({ error: 'Invalid payload' });
	}
});

router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
	const { id } = req.params;
	const updated = await Video.findByIdAndUpdate(id, req.body, { new: true });
	return res.json(updated);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
	const { id } = req.params;
	await Video.findByIdAndDelete(id);
	return res.status(204).end();
});

// Video upload route
router.post('/upload', authenticate, requireAdmin, upload.fields([
	{ name: 'previewFile', maxCount: 1 },
	{ name: 'fullFile', maxCount: 1 }
]), async (req, res) => {
	try {
		const { title, description, priceINR, folder } = req.body;
		
		if (!req.files || !req.files.previewFile || !req.files.fullFile) {
			return res.status(400).json({ error: 'Both preview and full video files are required' });
		}

		const previewFile = req.files.previewFile[0];
		const fullFile = req.files.fullFile[0];

		// Create video record
		const video = await Video.create({
			title,
			description,
			priceINR: Number(priceINR),
			previewUrl: `/uploads/videos/${previewFile.filename}`,
			fileUrl: `/uploads/videos/${fullFile.filename}`,
			thumbnailUrl: `/uploads/videos/${previewFile.filename}`, // Using preview as thumbnail for now
			folder: folder || 'General',
		});

		// Generate QR code for this video
		const qrToken = await createQrToken({
			userId: req.user.id,
			videoId: video._id,
			ttlMinutes: 60 * 24 * 365, // 1 year
			maxDownloads: 1000
		});

		// Update video with QR code ID
		video.qrCodeId = qrToken.token;
		await video.save();

		return res.status(201).json(video);
	} catch (err) {
		console.error('Upload error:', err);
		return res.status(500).json({ error: 'Upload failed' });
	}
});

export default router;
