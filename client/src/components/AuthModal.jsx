import { useState } from 'react'

export default function AuthModal({ isOpen, onClose, mode = 'login', onModeChange, onSuccess, userType = 'user' }) {
	const [formData, setFormData] = useState({ email: '', password: '', name: '' })
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e) => {
		e.preventDefault()
		setLoading(true)
		setError('')

		try {
			let endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
			
			// For admin signup, use create-admin endpoint
			if (userType === 'admin' && mode === 'signup') {
				endpoint = '/api/auth/create-admin'
			}
			
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Authentication failed')
			}

			localStorage.setItem('token', data.token)

			// Fetch current user to determine role (works for existing accounts)
			let me = null
			try {
				const meRes = await fetch('/api/auth/me', {
					headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
				})
				if (meRes.ok) {
					const meJson = await meRes.json()
					me = meJson.user
				}
			} catch (_) {}

			onSuccess({ token: data.token, user: me })
			onClose()
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	const handleChange = (e) => {
		setFormData(prev => ({
			...prev,
			[e.target.name]: e.target.value
		}))
	}

	if (!isOpen) return null

	const isAdmin = userType === 'admin'
	const gradientClass = isAdmin 
		? 'from-red-500 to-pink-500' 
		: 'from-blue-500 to-purple-500'

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white/95 backdrop-blur-lg rounded-3xl w-full max-w-md shadow-2xl border border-white/20 overflow-hidden">
				{/* Header */}
				<div className={`bg-gradient-to-r ${gradientClass} p-6 text-white relative overflow-hidden`}>
					<div className="absolute inset-0 bg-black/10"></div>
					<div className="relative z-10">
						<div className="flex justify-between items-center mb-4">
							<div className="flex items-center space-x-3">
								<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
									{isAdmin ? (
										<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
										</svg>
									) : (
										<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
									)}
								</div>
								<div>
									<h2 className="text-xl font-bold">
										{mode === 'login' ? 'Welcome Back' : 'Join Us'}
									</h2>
									<p className="text-white/80 text-sm">
										{isAdmin ? 'Admin Portal' : 'User Account'}
									</p>
								</div>
							</div>
							<button
								onClick={onClose}
								className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
					{/* Background decoration */}
					<div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
					<div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full"></div>
				</div>

				{/* Form */}
				<div className="p-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						{mode === 'signup' && (
							<div className="space-y-2">
								<label className="block text-sm font-medium text-gray-700">
									Full Name
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
									</div>
									<input
										type="text"
										name="name"
										value={formData.name}
										onChange={handleChange}
										className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
										placeholder="Enter your full name"
										required
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								Email Address
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
									</svg>
								</div>
								<input
									type="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									placeholder="Enter your email"
									required
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								Password
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
									</svg>
								</div>
								<input
									type="password"
									name="password"
									value={formData.password}
									onChange={handleChange}
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
									placeholder="Enter your password"
									required
								/>
							</div>
						</div>

						{error && (
							<div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
								<svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span className="text-red-700 text-sm">{error}</span>
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className={`w-full bg-gradient-to-r ${gradientClass} text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-2`}
						>
							{loading && (
								<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							)}
							<span>{loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}</span>
						</button>
					</form>

					<div className="mt-6 text-center">
						<button
							onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
							className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
						>
							{mode === 'login' 
								? "Don't have an account? Sign up" 
								: "Already have an account? Sign in"
							}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
