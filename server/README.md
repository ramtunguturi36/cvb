# Server (Express + MongoDB)

## Prerequisites
- Node.js 20+ (recommend 20.19.0 or newer)
- MongoDB running locally or a cloud URI

## Environment variables
Create a `.env` file in `server/` with:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/reels_platform
JWT_SECRET=replace_with_long_secret

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# SMTP for email delivery
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
FROM_EMAIL=no-reply@example.com

# Firebase service account (if needed later)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service-account@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Scripts
- `npm run dev` - start with nodemon
- `npm start` - start with node

## API overview
- `GET /health` health check
- `POST /api/auth/signup` { email, password, name } -> { token }
- `POST /api/auth/login` { email, password } -> { token }
- `GET /api/auth/me` (Bearer token) -> { user }
- `GET /api/videos/feed?page=1&limit=10`
- `POST /api/videos` (admin)
- `PATCH /api/videos/:id` (admin)
- `DELETE /api/videos/:id` (admin)
- `POST /api/orders/create` (auth) { videoId }
- `POST /api/orders/verify` (auth) { razorpay_order_id, razorpay_payment_id, razorpay_signature, videoId }
- `POST /api/access/verify` { token }
- `POST /api/access/consume` { token }
- `GET /api/admin/transactions` (admin)
- `GET /api/admin/videos` (admin)

## Notes
- Start MongoDB before running the server.
- For Razorpay verification, ensure the signature generation matches HMAC-SHA256 of `order_id|payment_id` with your secret.
