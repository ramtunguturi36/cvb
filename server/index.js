import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import videoRoutes from './src/routes/videos.js';
import orderRoutes from './src/routes/orders.js';
import accessRoutes from './src/routes/access.js';
import adminRoutes from './src/routes/admin.js';

// Load .env from the server directory explicitly (handles starting from repo root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Ensure uploads directory exists
import fs from 'fs';
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files with proper headers
app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    console.log('Requested file:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    // Enable CORS for video files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    
    // If file doesn't exist, return 404
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    // Set correct content type for video files
    if (req.path.match(/\.(mp4|webm|ogg)$/)) {
        res.header('Content-Type', 'video/mp4');
    }
    
    // Stream the file instead of using static middleware
    if (req.path.match(/\.(mp4|webm|ogg)$/)) {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
            const chunksize = (end-start)+1;
            const file = fs.createReadStream(filePath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } else {
        express.static(path.join(process.cwd(), 'uploads'))(req, res, next);
    }
});

app.get('/health', (req, res) => {
	return res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/admin', adminRoutes);

const port = process.env.PORT || 5000;

async function start() {
	try {
		await connectToDatabase(process.env.MONGODB_URI);
		console.log('Connected to MongoDB');
		// Basic env diagnostics (does not log secrets)
		console.log('Razorpay key present:', Boolean(process.env.RAZORPAY_KEY_ID));
		console.log('Razorpay secret present:', Boolean(process.env.RAZORPAY_KEY_SECRET));
		app.listen(port, () => {
			console.log(`Server running on http://localhost:${port}`);
		});
	} catch (err) {
		console.error('Failed to start server:', err.message);
		process.exit(1);
	}
}

start();
