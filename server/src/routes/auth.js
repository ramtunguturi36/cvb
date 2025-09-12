import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signJwt, authenticate } from '../utils/auth.js';

const router = Router();

router.post('/signup', async (req, res) => {
	try {
		const { email, password, name } = req.body;
		if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ error: 'Email already registered' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ email, passwordHash, name });
		const token = signJwt({ id: user._id, role: user.role, email: user.email });
		return res.json({ token });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = signJwt({ id: user._id, role: user.role, email: user.email });
		return res.json({ token });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
});

router.get('/me', authenticate, async (req, res) => {
	return res.json({ user: req.user });
});

// Create admin user (for development/testing)
router.post('/create-admin', async (req, res) => {
	try {
		const { email, password, name } = req.body;
		if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
		
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ error: 'Email already registered' });
		
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ email, passwordHash, name, role: 'admin' });
		const token = signJwt({ id: user._id, role: user.role, email: user.email });
		return res.json({ token, user });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
});

export default router;
