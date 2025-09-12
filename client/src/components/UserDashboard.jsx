import { useState, useEffect } from 'react'
import Feed from './Feed.jsx'
import ShoppingCart from './ShoppingCart.jsx'
import QRAccess from './QRAccess.jsx'
import PurchaseHistory from './PurchaseHistory.jsx'

export default function UserDashboard({ user, onLogout, onAddToCart }) {
	const [activeTab, setActiveTab] = useState('feed')
	const [showCart, setShowCart] = useState(false)
	const [showQRAccess, setShowQRAccess] = useState(false)
	const [cartItems, setCartItems] = useState([])
	const [purchases, setPurchases] = useState([])
	const [purchasedVideos, setPurchasedVideos] = useState([])
	const [qrTokens, setQrTokens] = useState([])
	const [loadingPurchased, setLoadingPurchased] = useState(false)
	const [purchaseError, setPurchaseError] = useState('')
	const [profileOpen, setProfileOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	// Lightweight Razorpay helpers (test/live controlled by your key env)
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

	async function openRazorpayCheckout({ amount, orderId }) {
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
					resolve(response)
				},
			})
			rzp.on('payment.failed', function () {
				reject(new Error('Payment failed'))
			})
			rzp.open()
		})
	}

	const addToCart = (video) => {
		if (cartItems.find(item => item._id === video._id)) return
		setCartItems(prev => [...prev, video])
	}

	const removeFromCart = (videoId) => {
		setCartItems(prev => prev.filter(item => item._id !== videoId))
	}

	const handleCheckout = async (items) => {
		const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
		if (!authToken) {
			alert('Please log in first to purchase.')
			return
		}
		if (!items || items.length === 0) return
		const collected = []
		for (const video of items) {
			try {
				// 1) Create order for each video
				const createRes = await fetch('/api/orders/create', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
					body: JSON.stringify({ videoId: video._id }),
				})
				if (!createRes.ok) throw new Error('Failed to create order')
				const { orderId, amount } = await createRes.json()

				// 2) Open Razorpay checkout (test mode if test key used)
				const rzpResponse = await openRazorpayCheckout({ amount, orderId })

				// 3) Verify payment on server
				const verifyRes = await fetch('/api/orders/verify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
					body: JSON.stringify({
						razorpay_order_id: rzpResponse.razorpay_order_id,
						razorpay_payment_id: rzpResponse.razorpay_payment_id,
						razorpay_signature: rzpResponse.razorpay_signature,
						videoId: video._id,
					}),
				})
				if (!verifyRes.ok) throw new Error('Verification failed')
				const vr = await verifyRes.json()
				collected.push({ videoId: video._id, title: video.title, token: vr.token, expiresAt: vr.expiresAt })
			} catch (err) {
				alert(`${video.title || 'Video'}: ${err.message || 'Payment failed'}`)
				// Stop further processing on failure to avoid multiple charges
				break
			}
		}
		if (collected.length > 0) {
			const lines = collected.map(c => `${c.title}: ${c.token}`).join('\n')
			alert(`✅ Payment successful for ${collected.length} item(s).\nQR tokens:\n${lines}`)
			setCartItems([])
			setShowCart(false)
		}
	}

	const handleAccessVideo = (video) => {
		window.open(video.fileUrl, '_blank')
	}

	// Fetch user's purchases and QR tokens when switching to purchased tab
	useEffect(() => {
		const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
		if (activeTab !== 'purchased' || !authToken) return
		let isCancelled = false
		async function loadPurchased() {
			setLoadingPurchased(true)
			setPurchaseError('')
			try {
				const [txRes, videosRes, qrRes] = await Promise.all([
					fetch('/api/orders/my-transactions', { headers: { Authorization: `Bearer ${authToken}` } }),
					fetch('/api/videos/purchased', { headers: { Authorization: `Bearer ${authToken}` } }),
					fetch('/api/access/my-qr', { headers: { Authorization: `Bearer ${authToken}` } }),
				])
				const tx = await txRes.json()
				const videos = await videosRes.json()
				const qr = await qrRes.json()
				if (!txRes.ok) throw new Error(tx.error || 'Failed to load transactions')
				if (!videosRes.ok) throw new Error(videos.error || 'Failed to load purchased videos')
				if (!qrRes.ok) throw new Error(qr.error || 'Failed to load QR tokens')
				if (!isCancelled) {
					setPurchases(tx.items || [])
					setPurchasedVideos(videos.items || [])
					setQrTokens(qr.items || [])
				}
			} catch (e) {
				if (!isCancelled) setPurchaseError(e.message)
			} finally {
				if (!isCancelled) setLoadingPurchased(false)
			}
		}
		loadPurchased()
		return () => { isCancelled = true }
	}, [activeTab])

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
			{/* Header */}
			<header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
								<span className="text-white font-bold text-lg">R</span>
							</div>
							</div>
							<div>
								<h1 className="text-xl font-bold text-gray-900">ReelsHub</h1>
								<p className="text-sm text-gray-500">Premium Video Platform</p>
							</div>
						</div>

						<div className="flex items-center space-x-4">
							{/* Navigation Tabs */}
							<div className="hidden md:flex space-x-1 bg-gray-100 rounded-lg p-1">
								<button
									onClick={() => setActiveTab('feed')}
									className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
										activeTab === 'feed'
											? 'bg-white text-gray-900 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									Discover
								</button>
								<button
									onClick={() => setActiveTab('purchased')}
									className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
										activeTab === 'purchased'
											? 'bg-white text-gray-900 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									Purchased Videos
								</button>
								<button
									onClick={() => setActiveTab('history')}
									className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
										activeTab === 'history'
											? 'bg-white text-gray-900 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									Purchase History
								</button>
							</div>

							{/* Actions */}
							<div className="flex items-center space-x-3">
								<button
									onClick={() => setShowQRAccess(true)}
									className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
								>
									Access QR
								</button>
								<button
									onClick={() => setShowCart(true)}
									className="relative px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
								>
									Shopping Cart
									{cartItems.length > 0 && (
										<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
											{cartItems.length}
										</span>
									)}
								</button>
								<button
									onClick={onLogout}
									className="px-3 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600"
								>
									Logout
								</button>

								{/* Profile */}
								<div className="relative">
									<button onClick={() => setProfileOpen(o => !o)} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
										<div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
											<span className="text-white text-sm font-medium">
												{user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
											</span>
										</div>
										<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									{profileOpen && (
										<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
											<div className="py-2">
												<div className="px-4 py-2 border-b border-gray-100">
													<p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
													<p className="text-xs text-gray-500">{user?.email || 'No email'}</p>
												</div>
												<button
													onClick={onLogout}
													className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
												>
													Sign Out
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
					</div>
				</div>
			</header>

			{/* Mobile Navigation */}
			<div className="md:hidden bg-white border-b border-gray-200">
				<div className="flex space-x-1 p-2">
					<button
						onClick={() => setActiveTab('feed')}
						className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
							activeTab === 'feed'
								? 'bg-blue-500 text-white'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						Discover
					</button>
					<button
						onClick={() => setActiveTab('purchased')}
						className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
							activeTab === 'purchased'
								? 'bg-blue-500 text-white'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						Purchased Videos
					</button>
					<button
						onClick={() => setActiveTab('history')}
						className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
							activeTab === 'history'
								? 'bg-blue-500 text-white'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						History
					</button>
				</div>
			</div>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{activeTab === 'feed' && (
					<div>
						<div className="mb-6 flex items-center justify-between">
							<div>
								<h2 className="text-3xl font-bold text-gray-900 mb-2">Discover Premium Content</h2>
								<p className="text-gray-600">Explore our collection of exclusive videos and find your next favorite content.</p>
							</div>
							<div className="w-full max-w-sm">
								<input
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by title or description..."
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
						<Feed onAddToCart={addToCart} searchQuery={searchQuery} />
					</div>
				)}

				{activeTab === 'history' && (
					<div>
						<div className="mb-8">
							<h2 className="text-3xl font-bold text-gray-900 mb-2">Purchase History</h2>
							<p className="text-gray-600">View all your purchase transactions and payment details.</p>
						</div>
						<PurchaseHistory user={user} />
					</div>
				)}

				{activeTab === 'purchased' && (
					<div>
						<div className="mb-8">
							<h2 className="text-3xl font-bold text-gray-900 mb-2">My Purchased Videos</h2>
							<p className="text-gray-600">Access all your purchased content and QR tokens.</p>
						</div>

						{purchaseError && (
							<div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 mb-6">
								<svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span className="text-red-700 text-sm">{purchaseError}</span>
							</div>
						)}

						{loadingPurchased ? (
							<div className="flex items-center justify-center py-16 text-gray-500">
								<svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Loading your purchases...
							</div>
						) : (
							<>
								{/* Purchased Videos */}
								<div className="mb-10">
									<h3 className="text-lg font-semibold text-gray-900 mb-6">Your Purchased Videos</h3>
									{!purchasedVideos.length ? (
										<div className="text-center py-12">
											<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
												<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
												</svg>
											</div>
											<p className="text-gray-500 font-medium">No purchased videos yet</p>
											<p className="text-gray-400 text-sm">Start exploring and purchase some premium content!</p>
										</div>
									) : (
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
											{purchasedVideos.map((video) => (
												<div key={video._id} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200">
													<div className="relative overflow-hidden">
														{video.fileUrl ? (
															<video 
																className="w-full h-80 object-cover bg-black group-hover:scale-105 transition-transform duration-300" 
																controls
																playsInline 
																muted
																preload="metadata"
																onError={(e) => {
																	const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
																	const fullUrl = video.fileUrl.startsWith('http') 
																		? video.fileUrl 
																		: `${baseUrl}${video.fileUrl}`;
																	if (e.target.src !== fullUrl) {
																		e.target.src = fullUrl;
																	}
																}}
															>
																<source 
																	src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${video.fileUrl}`} 
																	type="video/mp4" 
																/>
																Your browser does not support the video tag.
															</video>
														) : (
															<div className="w-full h-80 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
																<svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
																</svg>
															</div>
														)}
														<div className="absolute top-3 left-3">
															<span className="text-xs bg-green-600 text-white px-2 py-1 rounded-md font-medium">Purchased</span>
														</div>
														<div className="absolute top-3 right-3">
															<span className="text-xs bg-white/90 backdrop-blur px-2 py-1 rounded-md border border-gray-200">
																{new Date(video.purchaseDate).toLocaleDateString()}
															</span>
														</div>
													</div>
													<div className="p-6">
														<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
															{video.title}
														</h3>
														<p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
															{video.description || 'Premium video content.'}
														</p>
														<div className="flex items-center justify-between">
															<div className="flex items-center space-x-2">
																<span className="text-2xl font-bold text-green-600">₹{video.priceINR}</span>
																<span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded-full">Owned</span>
															</div>
															<div className="flex space-x-2">
																<button 
																	onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${video.fileUrl}`, '_blank')}
																	className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
																>
																	<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
																	</svg>
																	Watch
																</button>
																<button 
																	onClick={async () => {
																		const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
																		const path = video.fileUrl || ''
																		const url = path.startsWith('http') ? path : `${base}${path}`
																		const shareData = { title: video.title, text: video.description || 'Check out this video', url }
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
															</div>
														</div>
														{video.qrTokens && video.qrTokens.length > 0 && (
															<div className="mt-4 pt-4 border-t border-gray-100">
																<p className="text-xs text-gray-500 mb-2">QR Tokens ({video.qrTokens.length})</p>
																<div className="space-y-2">
																	{video.qrTokens.slice(0, 2).map((qr, index) => (
																		<div key={qr._id} className="flex items-center space-x-2">
																			<input readOnly value={qr.token} className="flex-1 text-xs px-2 py-1 border rounded bg-gray-50" />
																			<button
																				onClick={() => navigator.clipboard.writeText(qr.token)}
																				className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
																			>
																				Copy
																			</button>
																		</div>
																	))}
																	{video.qrTokens.length > 2 && (
																		<p className="text-xs text-gray-400">+{video.qrTokens.length - 2} more tokens</p>
																	)}
																</div>
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>

							</>
						)}
					</div>
				)}
			</main>

			{/* Shopping Cart Modal */}
			{showCart && (
				<ShoppingCart
					isOpen={showCart}
					onClose={() => setShowCart(false)}
					cartItems={cartItems}
					onRemoveItem={removeFromCart}
					onCheckout={handleCheckout}
				/>
			)}

			{/* QR Access Modal */}
			{showQRAccess && (
				<QRAccess
					isOpen={showQRAccess}
					onClose={() => setShowQRAccess(false)}
					onAccessVideo={handleAccessVideo}
				/>
			)}
		</div>
	)
}
