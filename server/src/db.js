import mongoose from 'mongoose';

export async function connectToDatabase(uri) {
	if (!uri) {
		throw new Error('Missing MONGODB_URI');
	}
	mongoose.set('strictQuery', true);
	await mongoose.connect(uri, {
		serverSelectionTimeoutMS: 10000,
	});
	return mongoose.connection;
}
