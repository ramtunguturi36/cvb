import { useEffect, useRef, useState, useCallback } from 'react'

function loadScript(src) {
	return new Promise((resolve, reject) => {
		const existing = document.querySelector(`script[src="${src}"]`)
		if (existing) return resolve(true)
		const script = document.createElement('script')
		script.src = src
		script.onload = () => resolve(true)
		script.onerror = () => reject(new Error('Failed to load script'))
		document.body.appendChild(script)
	})
}

async function openRazorpayCheckout({ amount, orderId, onSuccess }) {
	const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
	if (!ok || !window.Razorpay) throw new Error('Razorpay SDK failed to load')
	const key = import.meta.env.VITE_RAZORPAY_KEY_ID
	if (!key) throw new Error('Missing VITE_RAZORPAY_KEY_ID')
	return new Promise((resolve, reject) => {
		const rzp = new window.Razorpay({
			key,
			amount,
			currency: 'INR',
			order_id: orderId,
			handler: function (response) {
				onSuccess(response)
				resolve(true)
			},
		})
		rzp.on('payment.failed', function () {
			reject(new Error('Payment failed'))
		})
		rzp.open()
	})
}

function VideoCard({ item, onUnlock, onAddToCart, onSave }) {
	const videoRef = useRef(null)
	useEffect(() => {
		const el = videoRef.current
		if (!el) return
		const onIntersect = (entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					el.play().catch(() => {})
				} else {
					el.pause()
				}
			})
		}
		const obs = new IntersectionObserver(onIntersect, { threshold: 0.7 })
		obs.observe(el)
		return () => obs.disconnect()
	}, [])
	return (
		<div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200">
			<div className="relative overflow-hidden">
				{item.fileUrl ? (
					<>
						<video 
							ref={videoRef} 
							className="w-full h-80 object-cover bg-black group-hover:scale-105 transition-transform duration-300" 
							controls
							playsInline 
							muted
							preload="metadata"
							onError={(e) => {
								console.error('Video loading error:', e);
								console.log('Video URL:', item.fileUrl);
								
								// Get the full URL
								const baseUrl = window.location.origin;
								const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
								const fullUrl = item.fileUrl.startsWith('http') 
									? item.fileUrl 
									: `${apiUrl}${item.fileUrl}`;
								
								console.log('Attempting to load video from:', fullUrl);
								
								if (e.target.src !== fullUrl) {
									e.target.src = fullUrl;
								}
							}}
						>
							<source 
								src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.fileUrl}`} 
								type="video/mp4" 
							/>
							Your browser does not support the video tag.
						</video>
					</>
				) : (
					<div className="w-full h-80 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
						<svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					</div>
				)}
			</div>
			<div className="p-6">
				<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
					{item.title}
				</h3>
				<p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
					{item.description || 'Premium video content available for purchase.'}
				</p>
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<span className="text-2xl font-bold text-green-600">₹{item.priceINR}</span>
						<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Premium</span>
					</div>
					<div className="flex space-x-2">
						<button 
							onClick={() => onUnlock(item)} 
							className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
						>
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
							Buy Now
						</button>
						<button 
							onClick={() => onAddToCart && onAddToCart(item)} 
							className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
						>
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
							</svg>
							Add to Cart
						</button>
						<button 
							onClick={async () => {
								const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
								const path = item.previewUrl || item.fileUrl || ''
								const url = path.startsWith('http') ? path : `${base}${path}`
								const shareData = { title: item.title, text: item.description || 'Check out this video', url }
								try {
									if (navigator.share) {
										await navigator.share(shareData)
									} else {
										await navigator.clipboard.writeText(url)
										alert('Link copied to clipboard')
									}
								} catch (_) {}
							}}
							className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
						>
							<svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8a3 3 0 10-2.83-4H12a3 3 0 000 6h.17A3.001 3.001 0 0015 8zM7 12a3 3 0 100 6 3 3 0 000-6zm10 0a3 3 0 100 6 3 3 0 000-6z" />
							</svg>
							Share
						</button>
						<button 
							onClick={() => onSave && onSave(item)} 
							className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
						>
							<svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
							</svg>
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function Feed({ onAddToCart, searchQuery = '', onSave }) {
	const [items, setItems] = useState([])
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const sentinelRef = useRef(null)

	const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null

	const load = useCallback(async () => {
		if (loading || !hasMore) return
		setLoading(true)
		try {
			const qParam = encodeURIComponent(searchQuery || '')
			const res = await fetch(`/api/videos/feed?page=${page}&limit=6${qParam ? `&q=${qParam}` : ''}`)
			const data = await res.json()
			setItems((prev) => {
				// Filter out duplicates based on _id
				const newItems = data.items.filter(newItem => 
					!prev.some(existingItem => existingItem._id === newItem._id)
				);
				return [...prev, ...newItems];
			})
			setHasMore(data.hasMore)
			setPage((p) => p + 1)
		} catch (_) {
			/* noop */
		} finally {
			setLoading(false)
		}
	}, [page, hasMore, loading, searchQuery])

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Reset list when search query changes
	useEffect(() => {
		setItems([])
		setPage(1)
		setHasMore(true)
	}, [searchQuery])

	useEffect(() => {
		const el = sentinelRef.current
		if (!el) return
		const obs = new IntersectionObserver((entries) => {
			entries.forEach((e) => {
				if (e.isIntersecting) load()
			})
		})
		obs.observe(el)
		return () => obs.disconnect()
	}, [load])

	const onUnlock = useCallback(async (video) => {
		try {
			setMessage('')
			if (!authToken) {
				alert('Please log in first to purchase.')
				return
			}
			// 1) Create order
			const createRes = await fetch('/api/orders/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
				body: JSON.stringify({ videoId: video._id }),
			})
			if (!createRes.ok) throw new Error('Failed to create order')
			const { orderId, amount } = await createRes.json()
			
			// 2) Open Razorpay checkout
			await openRazorpayCheckout({ 
				amount, 
				orderId, 
				onSuccess: async (response) => {
					try {
						// 3) Verify payment on server
						const verifyRes = await fetch('/api/orders/verify', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
							body: JSON.stringify({
								razorpay_order_id: response.razorpay_order_id,
								razorpay_payment_id: response.razorpay_payment_id,
								razorpay_signature: response.razorpay_signature,
								videoId: video._id,
							}),
						})
						if (!verifyRes.ok) throw new Error('Verification failed')
						const vr = await verifyRes.json()
						// 4) Fetch QR image using token
						const qrRes = await fetch(`/api/access/qr/${vr.token}`)
						if (!qrRes.ok) throw new Error('Failed to fetch QR')
						const qrData = await qrRes.json()
						setMessage(`
							<div class="flex flex-col items-center">
								<p class="mb-4">✅ Payment successful!</p>
								<img src="${qrData.qrCode}" alt="QR Code" class="mb-4 w-48 h-48" />
								<p class="text-sm text-gray-600">QR Token: ${vr.token}</p>
								<p class="text-sm text-gray-600">Expires: ${new Date(vr.expiresAt).toLocaleString()}</p>
							</div>
						`)
					} catch (err) {
						alert('Payment verification failed: ' + err.message)
					}
				}
			})
		} catch (err) {
			alert(err.message || 'Payment failed')
		}
	}, [authToken])

	return (
		<div className="space-y-8">
			{message && (
				<div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
					<svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div 
						className="text-green-800 font-medium"
						dangerouslySetInnerHTML={{ __html: message }}
					/>
				</div>
			)}
			
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{items.map((it, index) => (
					<VideoCard key={it._id || `video-${index}`} item={it} onUnlock={onUnlock} onAddToCart={onAddToCart} onSave={onSave} />
				))}
			</div>
			
			<div ref={sentinelRef} className="h-10" />
			
			{loading && (
				<div className="flex justify-center py-8">
					<div className="flex items-center space-x-2 text-gray-500">
						<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span>Loading more videos...</span>
					</div>
				</div>
			)}
			
			{!hasMore && items.length > 0 && (
				<div className="text-center py-8">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<p className="text-gray-500 font-medium">You've reached the end!</p>
					<p className="text-gray-400 text-sm">No more videos to show.</p>
				</div>
			)}
		</div>
	)
}
