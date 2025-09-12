import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
		razorpayOrderId: { type: String, required: true },
		razorpayPaymentId: { type: String },
		razorpaySignature: { type: String },
		amountINR: { type: Number, required: true },
		currency: { type: String, default: 'INR' },
		status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
	},
	{ timestamps: true }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
