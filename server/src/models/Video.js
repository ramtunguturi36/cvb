import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		description: { type: String },
		thumbnailUrl: { type: String },
		previewUrl: { type: String, required: true },
		fileUrl: { type: String, required: true },
		priceINR: { type: Number, required: true, min: 1 },
		folder: { type: String, default: 'General', index: true },
		qrCodeId: { type: String },
		isActive: { type: Boolean, default: true },
		metadata: { type: mongoose.Schema.Types.Mixed },
	},
	{ timestamps: true }
);

export const Video = mongoose.model('Video', videoSchema);
