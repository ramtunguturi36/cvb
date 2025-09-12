import { useState, useEffect } from 'react'

export default function AdminDashboard({ user, onLogout }) {
	const [videos, setVideos] = useState([])
	const [folders, setFolders] = useState(['All'])
	const [activeFolder, setActiveFolder] = useState('All')
	const [searchQuery, setSearchQuery] = useState('')
	const [showUploadForm, setShowUploadForm] = useState(false)
	const [uploadData, setUploadData] = useState({
		title: '',
		description: '',
		priceINR: '',
		previewFile: null,
		fullFile: null,
		folder: 'General'
	})
	const [uploading, setUploading] = useState(false)

	// Edit modal state
	const [editingVideo, setEditingVideo] = useState(null)
	const [savingEdit, setSavingEdit] = useState(false)

	// Video player modal state
	const [playingVideo, setPlayingVideo] = useState(null)

	// Transactions and analytics
	const [transactions, setTransactions] = useState([])
	const [purchaseCounts, setPurchaseCounts] = useState({}) // videoId -> count of paid
	const [purchasersByVideo, setPurchasersByVideo] = useState({}) // videoId -> array of {email, date}

	const API_BASE = import.meta.env.VITE_API_URL || ''

	useEffect(() => {
		loadVideos()
	}, [activeFolder])

	useEffect(() => {
		loadFolders()
		loadTransactions()
	}, [])

	const loadVideos = async () => {
		try {
			const token = localStorage.getItem('token')
			const query = activeFolder && activeFolder !== 'All' ? `?folder=${encodeURIComponent(activeFolder)}` : ''
			const response = await fetch(`/api/admin/videos${query}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			})
			const data = await response.json()
			setVideos(data.items || [])
		} catch (err) {
			console.error('Failed to load videos:', err)
		}
	}

	const loadFolders = async () => {
		try {
			const token = localStorage.getItem('token')
			const response = await fetch('/api/admin/folders', {
				headers: { 'Authorization': `Bearer ${token}` }
			})
			const data = await response.json()
			setFolders(['All', ...(data.items || [])])
		} catch (err) {
			console.error('Failed to load folders:', err)
		}
	}

	const loadTransactions = async () => {
		try {
			const token = localStorage.getItem('token')
			const response = await fetch('/api/admin/transactions', {
				headers: { 'Authorization': `Bearer ${token}` }
			})
			const data = await response.json()
			const items = data.items || []
			setTransactions(items)

			// Aggregate counts and purchasers by video for status === 'paid'
			const counts = {}
			const purchasers = {}
			for (const t of items) {
				if (t.status !== 'paid') continue
				const vid = t.videoId?._id?.toString?.() || t.videoId?.toString?.() || String(t.videoId)
				counts[vid] = (counts[vid] || 0) + 1
				if (!purchasers[vid]) purchasers[vid] = []
				purchasers[vid].push({ email: t.userId?.email || 'Unknown', createdAt: t.createdAt, amountINR: t.amountINR })
			}
			setPurchaseCounts(counts)
			setPurchasersByVideo(purchasers)
		} catch (err) {
			console.error('Failed to load transactions:', err)
		}
	}

	const handleFileChange = (e, type) => {
		const file = e.target.files[0]
		if (file) {
			setUploadData(prev => ({
				...prev,
				[type]: file
			}))
		}
	}

	const handleUpload = async (e) => {
		e.preventDefault()
		if (!uploadData.previewFile || !uploadData.fullFile) {
			alert('Please select both QR code image and full video files')
			return
		}

		setUploading(true)
		try {
			const formData = new FormData()
			formData.append('title', uploadData.title)
			formData.append('description', uploadData.description)
			formData.append('priceINR', uploadData.priceINR)
			formData.append('previewFile', uploadData.previewFile)
			formData.append('fullFile', uploadData.fullFile)
			formData.append('folder', uploadData.folder || 'General')

			const token = localStorage.getItem('token')
			const response = await fetch('/api/videos/upload', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` },
				body: formData
			})

			if (!response.ok) {
				throw new Error('Upload failed')
			}

			const result = await response.json()
			setVideos(prev => [result, ...prev])
			setUploadData({ title: '', description: '', priceINR: '', previewFile: null, fullFile: null, folder: 'General' })
			setShowUploadForm(false)
			alert('Video uploaded successfully!')
			loadFolders()
			loadTransactions()
		} catch (err) {
			alert('Upload failed: ' + err.message)
		} finally {
			setUploading(false)
		}
	}

	const deleteVideo = async (videoId) => {
		if (!confirm('Are you sure you want to delete this video?')) return

		try {
			const token = localStorage.getItem('token')
			await fetch(`/api/videos/${videoId}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			})
			setVideos(prev => prev.filter(v => v._id !== videoId))
		} catch (err) {
			alert('Failed to delete video')
		}
	}

	const startEdit = (video) => {
		setEditingVideo({ ...video })
	}

	const saveEdit = async () => {
		if (!editingVideo?._id) return
		setSavingEdit(true)
		try {
			const token = localStorage.getItem('token')
			const res = await fetch(`/api/videos/${editingVideo._id}`, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: editingVideo.title,
					description: editingVideo.description,
					priceINR: Number(editingVideo.priceINR),
					folder: editingVideo.folder,
					isActive: editingVideo.isActive
				})
			})
			if (!res.ok) throw new Error('Failed to save changes')
			const updated = await res.json()
			setVideos(prev => prev.map(v => v._id === updated._id ? updated : v))
			setEditingVideo(null)
		} catch (e) {
			alert(e.message)
		} finally {
			setSavingEdit(false)
		}
	}

	const filteredVideos = videos.filter(v => {
		const q = searchQuery.trim().toLowerCase()
		if (!q) return true
		return (
			v.title?.toLowerCase().includes(q) ||
			v.description?.toLowerCase().includes(q) ||
			v.folder?.toLowerCase().includes(q)
		)
	})

	const toAbsolute = (url) => {
		if (!url) return ''
		if (url.startsWith('http')) return url
		return `${API_BASE}${url}`
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
			<header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div className="flex items-center space-x-4">
							<div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
								<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
								<p className="text-sm text-gray-500">Manage your video content and platform</p>
							</div>
						</div>
						<div className="flex items-center space-x-4">
							<div className="hidden md:block">
								<p className="text-sm font-medium text-gray-900">{user.name || 'Admin'}</p>
								<p className="text-xs text-gray-500">{user.email}</p>
							</div>
							<button
								onClick={onLogout}
								className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
								</svg>
								<span>Logout</span>
							</button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
						<h2 className="text-2xl font-bold text-gray-900">Videos</h2>
						<div className="flex-1 flex items-center gap-3">
							<div className="relative w-full max-w-md">
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by title, description, or folder..."
									className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
								</svg>
							</div>
							<select
								value={activeFolder}
								onChange={(e) => setActiveFolder(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-md bg-white"
							>
								{folders.map((f) => (
									<option key={f} value={f}>{f}</option>
								))}
							</select>
							<button
								onClick={() => setShowUploadForm(true)}
								className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
							>
								Upload New Video
							</button>
						</div>
					</div>

					{/* Upload Form Modal */}
					{showUploadForm && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
							<div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
								<div className="flex justify-between items-center mb-4">
									<h3 className="text-xl font-semibold">Upload Video</h3>
									<button
										onClick={() => setShowUploadForm(false)}
										className="text-gray-500 hover:text-gray-700"
									>
										✕
									</button>
								</div>

								<form onSubmit={handleUpload} className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Title *
										</label>
										<input
											type="text"
											value={uploadData.title}
											onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Description
										</label>
										<textarea
											value={uploadData.description}
											onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											rows={3}
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Price (INR) *
										</label>
										<input
											type="number"
											value={uploadData.priceINR}
											onChange={(e) => setUploadData(prev => ({ ...prev, priceINR: e.target.value }))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											min="1"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Folder
										</label>
										<input
											type="text"
											value={uploadData.folder}
											onChange={(e) => setUploadData(prev => ({ ...prev, folder: e.target.value }))}
											placeholder="e.g., Tutorials/Series A"
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										<p className="mt-1 text-xs text-gray-500">Type a new folder name or reuse an existing one.</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											QR Code Image *
										</label>
										<input
											type="file"
											accept="image/*"
											onChange={(e) => handleFileChange(e, 'previewFile')}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											required
										/>
										<p className="mt-1 text-sm text-gray-500">Upload the QR code image for access control</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Full Video *
										</label>
										<input
											type="file"
											accept="video/*"
											onChange={(e) => handleFileChange(e, 'fullFile')}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											required
										/>
									</div>

									<div className="flex justify-end space-x-3">
										<button
											type="button"
											onClick={() => setShowUploadForm(false)}
											className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
										>
											Cancel
										</button>
										<button
											type="submit"
											disabled={uploading}
											className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
										>
											{uploading ? 'Uploading...' : 'Upload'}
										</button>
									</div>
								</form>
							</div>
						</div>
					)}

					{/* Videos List */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredVideos.map((video) => {
							const count = purchaseCounts[video._id] || 0
							return (
								<div key={video._id} className="group bg-white rounded-xl shadow border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
									<div className="relative">
										{video.fileUrl ? (
											<video
												src={toAbsolute(video.fileUrl)}
												className="w-full h-64 object-cover bg-black"
												controls
												playsInline
												preload="metadata"
											/>
										) : (
											<div className="w-full h-44 bg-gray-100 flex items-center justify-center text-gray-400">No video file</div>
										)}
										<div className="absolute top-3 left-3">
											<span className="text-xs bg-white/90 backdrop-blur px-2 py-1 rounded-md border border-gray-200">{video.folder || 'General'}</span>
										</div>
										<div className="absolute top-3 right-3">
											<span className="text-xs font-medium bg-green-600 text-white px-2 py-1 rounded-md">{count} purchased</span>
										</div>
									</div>
									<div className="p-4 space-y-2">
										<h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{video.title}</h3>
										<p className="text-gray-600 text-sm line-clamp-2">{video.description}</p>
										<div className="flex items-center justify-between">
											<span className="text-lg font-bold text-green-600">₹{video.priceINR}</span>
											<div className="flex items-center gap-2">
												<button onClick={() => setPlayingVideo(video)} className="text-blue-600 hover:text-blue-800 text-sm">Play</button>
												<button onClick={() => startEdit(video)} className="text-gray-700 hover:text-gray-900 text-sm">Edit</button>
												<button onClick={() => deleteVideo(video._id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
											</div>
										</div>
										{(purchasersByVideo[video._id]?.length || 0) > 0 && (
											<div className="pt-2 border-t border-gray-100">
												<button
													onClick={() => alert(purchasersByVideo[video._id].map(p => `${p.email} • ₹${p.amountINR} • ${new Date(p.createdAt).toLocaleString()}`).join('\n'))}
													className="text-xs text-gray-600 hover:text-gray-800"
												>
													View purchasers ({purchasersByVideo[video._id].length})
												</button>
											</div>
										)}
										<div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
											{video.previewUrl && (
												<div>
													<img 
														src={toAbsolute(video.previewUrl)} 
														alt="Video Preview" 
														className="w-20 h-20 object-cover rounded" 
													/>
												</div>
											)}
											<span className="ml-auto">{video.isActive ? 'Active' : 'Inactive'}</span>
										</div>
									</div>
								</div>
							)
						})}
					</div>

					{filteredVideos.length === 0 && (
						<div className="text-center py-12">
							<p className="text-gray-500">No videos found.</p>
						</div>
					)}

					{/* Purchases History Section */}
					<div className="mt-10">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-xl font-semibold text-gray-900">Purchase History</h3>
							<span className="text-sm text-gray-500">{transactions.length} records</span>
						</div>
						<div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-100">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{transactions.map((t) => (
										<tr key={t._id} className="hover:bg-gray-50">
											<td className="px-4 py-2 text-sm text-gray-600">{new Date(t.createdAt).toLocaleString()}</td>
											<td className="px-4 py-2 text-sm text-gray-900">{t.userId?.email || 'Unknown'}</td>
											<td className="px-4 py-2 text-sm text-gray-900">{t.videoId?.title || String(t.videoId)}</td>
											<td className="px-4 py-2 text-sm text-gray-900">₹{t.amountINR}</td>
											<td className="px-4 py-2 text-xs">
												<span className={`px-2 py-1 rounded-md border ${t.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : t.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{t.status}</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</main>

			{/* Edit Modal */}
			{editingVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-xl mx-4">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-xl font-semibold">Edit Video</h3>
							<button onClick={() => setEditingVideo(null)} className="text-gray-500 hover:text-gray-700">✕</button>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
								<input type="text" value={editingVideo.title || ''} onChange={(e) => setEditingVideo(v => ({ ...v, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea value={editingVideo.description || ''} onChange={(e) => setEditingVideo(v => ({ ...v, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Price (INR)</label>
									<input type="number" value={editingVideo.priceINR || 0} min={1} onChange={(e) => setEditingVideo(v => ({ ...v, priceINR: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
									<input type="text" value={editingVideo.folder || ''} onChange={(e) => setEditingVideo(v => ({ ...v, folder: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
								</div>
							</div>
							<div className="flex items-center gap-2">
								<input id="isActive" type="checkbox" checked={!!editingVideo.isActive} onChange={(e) => setEditingVideo(v => ({ ...v, isActive: e.target.checked }))} />
								<label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
							</div>
							<div className="flex justify-end gap-3">
								<button onClick={() => setEditingVideo(null)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
								<button onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{savingEdit ? 'Saving...' : 'Save changes'}</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Video Player Modal */}
			{playingVideo && (
				<div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
					<div className="bg-black rounded-lg w-full max-w-3xl mx-4 overflow-hidden">
						<div className="flex items-center justify-between p-3 bg-black/60">
							<h4 className="text-white font-semibold truncate pr-3">{playingVideo.title}</h4>
							<button onClick={() => setPlayingVideo(null)} className="text-white/80 hover:text-white">✕</button>
						</div>
						<div className="bg-black">
							<video src={toAbsolute(playingVideo.fileUrl)} controls className="w-full max-h-[70vh] bg-black" />
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
