import { useState } from 'react'

export default function QRAccess({ isOpen, onClose, onAccessVideo }) {
	const [qrToken, setQrToken] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [video, setVideo] = useState(null)
	const [qrImage, setQrImage] = useState('')

	const handleVerify = async (e) => {
		e.preventDefault()
		if (!qrToken.trim()) return

		setLoading(true)
		setError('')
		setVideo(null)

		try {
			const response = await fetch('/api/access/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: qrToken })
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Invalid QR token')
			}

			setVideo(data.video)
			// Also fetch QR image to display
			try {
				const qrRes = await fetch(`/api/access/qr/${qrToken}`)
				if (qrRes.ok) {
					const qrData = await qrRes.json()
					setQrImage(qrData.qrCode || '')
				}
			} catch (_) {
				// best effort; ignore
			}
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	const handleConsume = async () => {
		if (!video) return

		setLoading(true)
		try {
			const response = await fetch('/api/access/consume', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: qrToken })
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Failed to access video')
			}

			onAccessVideo(video)
			onClose()
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
					<div className="flex justify-between items-center">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0 0h-2m2 0v-4m0 0h2m-2 0v-4m0 0h-2m2 0h2" />
								</svg>
							</div>
							<div>
								<h2 className="text-xl font-bold">Access Video</h2>
								<p className="text-white/80 text-sm">Enter your QR token</p>
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

				{/* Content */}
				<div className="p-6">

					{!video ? (
						<form onSubmit={handleVerify} className="space-y-6">
							<div className="space-y-2">
								<label className="block text-sm font-medium text-gray-700">
									QR Token
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0 0h-2m2 0v-4m0 0h2m-2 0v-4m0 0h-2m2 0h2" />
										</svg>
									</div>
									<input
										type="text"
										value={qrToken}
										onChange={(e) => setQrToken(e.target.value)}
										placeholder="Enter your QR token"
										className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
								className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2"
							>
								{loading && (
									<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								)}
								<span>{loading ? 'Verifying...' : 'Verify Token'}</span>
							</button>
						</form>
					) : (
						<div className="space-y-6">
							<div className="text-center">
								<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-2">
									{video.title}
								</h3>
								<p className="text-gray-600">Token verified successfully!</p>
								<p className="text-gray-600">Scan the QR below to access on another device, or click Access Video.</p>
							</div>

							{qrImage && (
								<div className="text-center">
									<img src={qrImage} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg border border-gray-200" />
									<p className="text-xs text-gray-500 mt-2 break-all">Token: {qrToken}</p>
									<div className="mt-3 flex items-center justify-center space-x-2">
										<button
											onClick={() => {
												if (!qrImage) return
												const link = document.createElement('a')
												link.href = qrImage
												link.download = `qr-${qrToken}.png`
												document.body.appendChild(link)
												link.click()
												link.remove()
											}}
											className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
										>
											Download QR
										</button>
									</div>
								</div>
							)}

							<div className="flex space-x-3">
								<button
									onClick={() => {
										setVideo(null)
										setQrToken('')
										setError('')
									}}
									className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
								>
									Back
								</button>
								<button
									onClick={handleConsume}
									disabled={loading}
									className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 font-semibold flex items-center justify-center space-x-2"
								>
									{loading && (
										<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									)}
									<span>{loading ? 'Accessing...' : 'Access Video'}</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
