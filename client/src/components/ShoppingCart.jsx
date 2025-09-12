import { useState } from 'react'

export default function ShoppingCart({ isOpen, onClose, cartItems, onRemoveItem, onCheckout }) {
	const [checkingOut, setCheckingOut] = useState(false)

	const totalAmount = cartItems.reduce((sum, item) => sum + item.priceINR, 0)

	const handleCheckout = async () => {
		setCheckingOut(true)
		try {
			await onCheckout(cartItems)
		} finally {
			setCheckingOut(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
					<div className="flex justify-between items-center">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
								</svg>
							</div>
							<div>
								<h2 className="text-xl font-bold">Shopping Cart</h2>
								<p className="text-white/80 text-sm">{cartItems.length} items</p>
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
				<div className="p-6 overflow-y-auto max-h-[60vh]">

					{cartItems.length === 0 ? (
						<div className="text-center py-12">
							<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
								</svg>
							</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
							<p className="text-gray-500">Add some videos to get started!</p>
						</div>
					) : (
						<>
							<div className="space-y-4 mb-6">
								{cartItems.map((item) => (
									<div key={item._id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
										{item.previewUrl && (
											<video
												src={item.previewUrl}
												className="w-16 h-16 object-cover rounded-lg"
												muted
												loop
												playsInline
											/>
										)}
										<div className="flex-1 min-w-0">
											<h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
												{item.title}
											</h3>
											<p className="text-sm text-gray-500">₹{item.priceINR}</p>
										</div>
										<button
											onClick={() => onRemoveItem(item._id)}
											className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
											title="Remove item"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								))}
							</div>

							<div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
								<div className="flex justify-between items-center mb-4">
									<span className="text-lg font-bold text-gray-900">Total:</span>
									<span className="text-2xl font-bold text-green-600">₹{totalAmount}</span>
								</div>
								<button
									onClick={handleCheckout}
									disabled={checkingOut}
									className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2"
								>
									{checkingOut && (
										<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									)}
									<span>{checkingOut ? 'Processing...' : 'Proceed to Checkout'}</span>
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
