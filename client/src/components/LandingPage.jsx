import { useState } from 'react'
import AuthModal from './AuthModal.jsx'

export default function LandingPage({ onUserLogin, onAdminLogin }) {
	const [showUserAuth, setShowUserAuth] = useState(false)
	const [showAdminAuth, setShowAdminAuth] = useState(false)
	const [authMode, setAuthMode] = useState('login')

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
			{/* Navigation */}
			<nav className="relative z-10 px-6 py-4">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg flex items-center justify-center">
							<span className="text-white font-bold text-lg">R</span>
						</div>
						<span className="text-white text-xl font-bold">ReelsHub</span>
					</div>
					<div className="flex space-x-4">
						<button
							onClick={() => {
								setAuthMode('login')
								setShowUserAuth(true)
							}}
							className="text-white hover:text-gray-300 transition-colors"
						>
							Login
						</button>
						<button
							onClick={() => {
								setAuthMode('signup')
								setShowUserAuth(true)
							}}
							className="bg-white text-purple-900 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors font-medium"
						>
							Sign Up
						</button>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<div className="relative z-10 px-6 py-20">
				<div className="max-w-7xl mx-auto text-center">
					<h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
						Premium Video
						<span className="block bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
							Content Platform
						</span>
					</h1>
					<p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
						Discover, purchase, and access exclusive video content with our secure QR-based system. 
						Join thousands of creators and viewers in the future of digital content.
					</p>
					
					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
						<button
							onClick={() => {
								setAuthMode('signup')
								setShowUserAuth(true)
							}}
							className="group relative px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-full font-semibold text-lg hover:from-pink-600 hover:to-violet-600 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
						>
							<span className="relative z-10">Start Watching</span>
							<div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
						</button>
						<button
							onClick={() => {
								setAuthMode('login')
								setShowAdminAuth(true)
							}}
							className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold text-lg hover:bg-white hover:text-purple-900 transition-all duration-300"
						>
							Admin Portal
						</button>
					</div>

					{/* Features Grid */}
					<div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
							<div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-violet-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
								<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-white mb-4">Premium Content</h3>
							<p className="text-gray-300">Access exclusive video content from top creators with secure QR-based authentication.</p>
						</div>

						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
							<div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
								<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-white mb-4">Secure Access</h3>
							<p className="text-gray-300">Your purchases are protected with encrypted QR tokens and secure payment processing.</p>
						</div>

						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
							<div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
								<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-white mb-4">Instant Access</h3>
							<p className="text-gray-300">Get immediate access to your purchased content with instant QR token delivery.</p>
						</div>
					</div>
				</div>
			</div>

			{/* Background Elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
				<div className="absolute top-40 left-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
			</div>

			{/* User Auth Modal */}
			{showUserAuth && (
				<AuthModal
					isOpen={showUserAuth}
					onClose={() => setShowUserAuth(false)}
					mode={authMode}
					onModeChange={setAuthMode}
					onSuccess={onUserLogin}
					userType="user"
				/>
			)}

			{/* Admin Auth Modal */}
			{showAdminAuth && (
				<AuthModal
					isOpen={showAdminAuth}
					onClose={() => setShowAdminAuth(false)}
					mode={authMode}
					onModeChange={setAuthMode}
					onSuccess={onAdminLogin}
					userType="admin"
				/>
			)}
		</div>
	)
}
