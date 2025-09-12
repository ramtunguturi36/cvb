import { useState, useEffect } from 'react'

export default function PurchaseHistory({ user }) {
	const [purchases, setPurchases] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		const fetchPurchaseHistory = async () => {
			const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
			if (!authToken) return

			setLoading(true)
			setError('')
			try {
				const response = await fetch('/api/orders/my-transactions', {
					headers: { Authorization: `Bearer ${authToken}` }
				})
				const data = await response.json()
				if (!response.ok) throw new Error(data.error || 'Failed to fetch purchase history')
				setPurchases(data.items || [])
			} catch (err) {
				setError(err.message)
			} finally {
				setLoading(false)
			}
		}

		fetchPurchaseHistory()
	}, [])

	const getStatusColor = (status) => {
		switch (status) {
			case 'paid': return 'text-green-600 bg-green-100'
			case 'created': return 'text-yellow-600 bg-yellow-100'
			case 'failed': return 'text-red-600 bg-red-100'
			case 'refunded': return 'text-gray-600 bg-gray-100'
			default: return 'text-gray-600 bg-gray-100'
		}
	}

	const getStatusIcon = (status) => {
		switch (status) {
			case 'paid': return (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			)
			case 'created': return (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			)
			case 'failed': return (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
				</svg>
			)
			case 'refunded': return (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
				</svg>
			)
			default: return (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			)
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16 text-gray-500">
				<svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
					<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Loading purchase history...
			</div>
		)
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
				<svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span className="text-red-700 text-sm">{error}</span>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">Purchase History</h3>
				<span className="text-sm text-gray-500">{purchases.length} transactions</span>
			</div>

			{!purchases.length ? (
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
					</div>
					<p className="text-gray-500 font-medium">No purchase history yet</p>
					<p className="text-gray-400 text-sm">Your purchase transactions will appear here</p>
				</div>
			) : (
				<div className="space-y-4">
					{purchases.map((purchase) => (
						<div key={purchase._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center space-x-3 mb-3">
										<div className={`p-2 rounded-lg ${getStatusColor(purchase.status)}`}>
											{getStatusIcon(purchase.status)}
										</div>
										<div>
											<h4 className="text-lg font-semibold text-gray-900">
												{purchase.videoId?.title || 'Video'}
											</h4>
											<p className="text-sm text-gray-500">
												Purchased on {new Date(purchase.createdAt).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</p>
										</div>
									</div>
									
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
										<div>
											<span className="text-gray-500">Amount:</span>
											<span className="ml-2 font-semibold text-gray-900">₹{purchase.amountINR}</span>
										</div>
										<div>
											<span className="text-gray-500">Status:</span>
											<span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
												{purchase.status.toUpperCase()}
											</span>
										</div>
										<div>
											<span className="text-gray-500">Payment ID:</span>
											<span className="ml-2 font-mono text-xs text-gray-600">
												{purchase.razorpayPaymentId ? 
													purchase.razorpayPaymentId.slice(-8) : 
													purchase.razorpayOrderId.slice(-8)
												}
											</span>
										</div>
									</div>

									{purchase.videoId?.fileUrl && (
										<div className="mt-4 pt-4 border-t border-gray-100">
											<button
												onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${purchase.videoId.fileUrl}`, '_blank')}
												className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
											>
												<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
												</svg>
												Watch Video
											</button>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
