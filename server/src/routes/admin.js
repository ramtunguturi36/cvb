import { Router } from 'express';
import { requireAdmin, authenticate } from '../utils/auth.js';
import { Transaction } from '../models/Transaction.js';
import { Video } from '../models/Video.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/transactions', async (req, res) => {
	const items = await Transaction.find().populate('userId', 'email').populate('videoId', 'title');
	return res.json({ items });
});

router.get('/videos', async (req, res) => {
	const { folder } = req.query;
	const where = folder ? { folder } : {};
	const items = await Video.find(where).sort({ createdAt: -1 });
	return res.json({ items });
});

router.get('/folders', async (req, res) => {
	const folders = await Video.distinct('folder');
	return res.json({ items: folders });
});

export default router;
