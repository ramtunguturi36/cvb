import jwt from 'jsonwebtoken';

export function signJwt(payload, options = {}) {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('Missing JWT_SECRET');
	return jwt.sign(payload, secret, { expiresIn: '7d', ...options });
}

export function authenticate(req, res, next) {
	try {
		const header = req.headers.authorization || '';
		const token = header.startsWith('Bearer ') ? header.slice(7) : null;
		if (!token) return res.status(401).json({ error: 'Unauthorized' });
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
}

export function requireAdmin(req, res, next) {
	if (!req.user || req.user.role !== 'admin') {
		return res.status(403).json({ error: 'Forbidden' });
	}
	return next();
}
