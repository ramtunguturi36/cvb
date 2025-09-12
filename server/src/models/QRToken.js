import mongoose from 'mongoose';

const qrTokenSchema = new mongoose.Schema(
	{
		videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		token: { type: String, required: true, unique: true, index: true },
		expiresAt: { type: Date, required: true },
		maxDownloads: { type: Number, default: 1 },
		downloadCount: { type: Number, default: 0 },
		isRevoked: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

export const QRToken = mongoose.model('QRToken', qrTokenSchema);
