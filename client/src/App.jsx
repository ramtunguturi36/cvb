import { useState, useEffect } from 'react'
import './App.css'
import LandingPage from './components/LandingPage.jsx'
import UserDashboard from './components/UserDashboard.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import AuthModal from './components/AuthModal.jsx'
import ShoppingCart from './components/ShoppingCart.jsx'
import QRAccess from './components/QRAccess.jsx'

function App() {
	const [user, setUser] = useState(null)
	const [showAuth, setShowAuth] = useState(false)
	const [authMode, setAuthMode] = useState('login')
	const [showCart, setShowCart] = useState(false)
	const [showQRAccess, setShowQRAccess] = useState(false)
	const [cartItems, setCartItems] = useState([])
	const [isAdmin, setIsAdmin] = useState(false)

	useEffect(() => {
		try { localStorage.removeItem('token') } catch (_) {}
		setUser(null)
		setIsAdmin(false)
	}, [])

	const checkAuth = async () => {
		// disabled: we require fresh login each load
	}

	const handleAuthSuccess = (data) => {
		setUser(data.user || { email: data.email, role: data.role })
		setIsAdmin((data.user?.role || data.role) === 'admin')
		setShowAuth(false)
	}

	const handleLogout = () => {
		localStorage.removeItem('token')
		setUser(null)
		setIsAdmin(false)
		setCartItems([])
	}

	const addToCart = (video) => {
		if (cartItems.find(item => item._id === video._id)) return
		setCartItems(prev => [...prev, video])
	}

	const removeFromCart = (videoId) => {
		setCartItems(prev => prev.filter(item => item._id !== videoId))
	}

	const handleCheckout = async (items) => {
		if (!user) {
			alert('Please log in to checkout')
			return
		}

		try {
			const results = []
			for (const item of items) {
				const result = await processPayment(item)
				results.push({ item, result })
			}
			
			setCartItems([])
			setShowCart(false)
			
			// Show success message with QR tokens
			const tokens = results.map(r => `${r.item.title}: ${r.result.token}`).join('\n')
			alert(`Payment successful! QR tokens:\n${tokens}\n\nCheck your email for detailed information.`)
		} catch (err) {
			alert('Payment failed: ' + err.message)
		}
	}

	const processPayment = async (video) => {
		const response = await fetch('/api/orders/create', {
			method: 'POST',
			headers: { 
				'Content-Type': 'application/json', 
				'Authorization': `Bearer ${localStorage.getItem('token')}` 
			},
			body: JSON.stringify({ videoId: video._id })
		})

		if (!response.ok) throw new Error('Failed to create order')
		const { orderId, amount } = await response.json()

		// Load Razorpay script
		const script = document.createElement('script')
		script.src = 'https://checkout.razorpay.com/v1/checkout.js'
		document.body.appendChild(script)

		return new Promise((resolve, reject) => {
			script.onload = () => {
				const rzp = new window.Razorpay({
					key: import.meta.env.VITE_RAZORPAY_KEY_ID,
					amount: amount,
					currency: 'INR',
					order_id: orderId,
					handler: async (response) => {
						try {
							const verifyRes = await fetch('/api/orders/verify', {
								method: 'POST',
								headers: { 
									'Content-Type': 'application/json', 
									'Authorization': `Bearer ${localStorage.getItem('token')}` 
								},
								body: JSON.stringify({
									razorpay_order_id: response.razorpay_order_id,
									razorpay_payment_id: response.razorpay_payment_id,
									razorpay_signature: response.razorpay_signature,
									videoId: video._id,
								}),
							})
							if (!verifyRes.ok) throw new Error('Verification failed')
							const vr = await verifyRes.json()
							resolve(vr)
						} catch (err) {
							reject(err)
						}
					},
					modal: {
						ondismiss: () => reject(new Error('Payment cancelled'))
					}
				})
				rzp.open()
			}
		})
	}

	const handleAccessVideo = (video) => {
		// Handle video access - you might want to open in a new tab or modal
		window.open(video.fileUrl, '_blank')
	}

	// Show landing page if no user is logged in
	if (!user) {
		return (
			<LandingPage
				onUserLogin={handleAuthSuccess}
				onAdminLogin={handleAuthSuccess}
			/>
		)
	}

	// Show admin dashboard if user is admin
	if (isAdmin) {
		return <AdminDashboard user={user} onLogout={handleLogout} />
	}

	// Show user dashboard for regular users
	return (
		<UserDashboard
			user={user}
			onLogout={handleLogout}
			onAddToCart={addToCart}
		/>
	)
}

export default App
