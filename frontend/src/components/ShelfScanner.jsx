import React, { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import toast from 'react-hot-toast'
import api from '../api/axios'

const ShelfScanner = () => {
  const [codes, setCodes] = useState(new Set())
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [detectedBooks, setDetectedBooks] = useState([])
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [loadError, setLoadError] = useState(null)

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const codeReaderRef = useRef(null)
  const cancelScanRef = useRef(null)
  const scannedRef = useRef(new Map())

  // Initialize ZXing reader
  useEffect(() => {
    try {
      codeReaderRef.current = new BrowserMultiFormatReader()

      // Get available cameras
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setAvailableCameras(videoDevices)
          
          // Auto-select first camera if none selected
          if (videoDevices.length > 0 && !selectedCamera) {
            setSelectedCamera(videoDevices[0].deviceId)
          }
        })
        .catch(err => {
          console.error('Camera enumeration error:', err)
          setLoadError('Failed to detect cameras. Please check camera permissions.')
        })
    } catch (err) {
      console.error('ZXing init error:', err)
      setLoadError('Failed to load scanner library. Please refresh page.')
    }

    return () => {
      stopCameraStream()
    }
  }, [])

  // Stop camera and scanning
  const stopCameraStream = () => {
    // Stop ZXing decoding by resetting the reader
    try {
      if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
        codeReaderRef.current.reset()
      }
    } catch (_) {}

    // Clear the scan control reference
    cancelScanRef.current = null

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }

    setScanning(false)
  }

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file || !codeReaderRef.current) return

    setProcessing(true)
    setCodes(new Set())
    setDetectedBooks([])

    const objectUrl = URL.createObjectURL(file)
    setUploadedImage(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return objectUrl
    })

    const img = new Image()
    img.onload = async () => {
      try {
        const result = await codeReaderRef.current.decodeFromImageElement(img)
        if (result) {
          const detectedCode = result.getText()
          setCodes(new Set([detectedCode]))
          await lookupBook(detectedCode)
          toast.success(`Barcode detected: ${detectedCode}`)
        } else {
          toast.error('No barcode detected in image')
        }
      } catch (error) {
        console.error('Barcode detection error:', error)
        toast.error('No barcode detected in image')
      } finally {
        setProcessing(false)
      }
    }
    img.onerror = () => {
      toast.error('Failed to load image')
      setProcessing(false)
    }
    img.src = objectUrl
  }

  // Lookup book by barcode
  const lookupBook = async (barcode) => {
    try {
      const response = await api.get(`/books?accNo=${barcode}&limit=1`)
      const data = await response.data
      if (data.success && data.data.books.length > 0) {
        const book = data.data.books[0]
        setDetectedBooks(prev => {
          if (prev.some(b => b._id === book._id)) return prev
          return [...prev, book]
        })
        return book
      } else {
        const bookIdResponse = await api.get(`/books?bookId=${barcode}&limit=1`)
        const bookIdData = await bookIdResponse.data
        if (bookIdData.success && bookIdData.data.books.length > 0) {
          const book = bookIdData.data.books[0]
          setDetectedBooks(prev => {
            if (prev.some(b => b._id === book._id)) return prev
            return [...prev, book]
          })
          return book
        } else {
          toast(`Book not found for barcode: ${barcode}`, { icon: "⚠️" })
          return null
        }
      }
    } catch (error) {
      console.error('Book lookup error:', error)
      toast.error('Failed to lookup book')
      return null
    }
  }

  // Start live camera scan
  const startCameraScan = async () => {
    if (!codeReaderRef.current) return

    stopCameraStream() // stop previous scan

    try {
      setScanning(true)
      setCodes(new Set())
      setDetectedBooks([])
      setUploadedImage(null)

      // Use selected camera or find USB camera
      let targetDevice = null
      
      if (selectedCamera) {
        // Use previously selected camera
        targetDevice = availableCameras.find(d => d.deviceId === selectedCamera)
      }
      
      if (!targetDevice) {
        // Try to find USB camera (external cameras usually have "USB" in label or are not default)
        targetDevice = availableCameras.find(d => 
          d.label && (
            d.label.toLowerCase().includes('usb') ||
            d.label.toLowerCase().includes('external') ||
            d.label.toLowerCase().includes('hd') ||
            !d.label.toLowerCase().includes('integrated') &&
            !d.label.toLowerCase().includes('built-in')
          )
        ) || availableCameras[0] // fallback to first camera
      }

      if (!targetDevice) {
        toast.error('No suitable camera found')
        setScanning(false)
        return
      }

      console.log('Using camera:', targetDevice.label, 'ID:', targetDevice.deviceId)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: targetDevice.deviceId ? { exact: targetDevice.deviceId } : undefined,
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous',
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // Start scanning with enhanced detection
        codeReaderRef.current.decodeFromVideoDevice(
          targetDevice.deviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const code = result.getText()
              
              // Prevent duplicate rapid scans with time-based cooldown
              const now = Date.now()
              const lastScanTime = scannedRef.current.get(code) || 0
              if (now - lastScanTime < 1000) { // 1 second cooldown per code
                return
              }
              
              scannedRef.current.set(code, now) // Store timestamp instead of just boolean
              console.log('🔍 Detected:', code)

              // Update state immediately
              setCodes(prev => {
                if (prev.has(code)) {
                  return prev
                }
                const newSet = new Set(prev)
                newSet.add(code)
                return newSet
              })

              lookupBook(code)
              toast.success(`Scanned: ${code}`)
            } else if (error && error.name !== 'NotFoundException') {
              // Only log real errors, not "not found" which is normal
              console.log("Scan error:", error.message)
            }
          }
        )
      }
    } catch (error) {
      console.error('Camera access error:', error)
      toast.error('Failed to access camera. Please check permissions.')
      setScanning(false)
    }
  }

  // Stop camera scan and optionally process batch
  const stopCameraScan = async () => {
    stopCameraStream()
    if (codes.size > 0) {
      const codesArray = Array.from(codes)
      toast(`Stopping scan and processing ${codes.size} detected barcodes...`)
      await processBatchCodes(codesArray)
    } else {
      toast('No barcodes detected to process')
    }
  }

  // Process batch codes
  const processBatchCodes = async (codeArray) => {
    setProcessing(true)
    try {
      const response = await api.post('/books/batch-lookup', { codes: codeArray })
      const data = response.data
      if (data.success) {
        const foundBooks = data.data.results
          .filter(result => result.found)
          .map(result => result.book)
        setDetectedBooks(foundBooks)
        toast.success(
          `Processed ${codeArray.length} codes: ${foundBooks.length} found, ${data.data.missing} missing`
        )
      } else {
        toast.error('Failed to process barcodes')
      }
    } catch (error) {
      console.error('Batch processing error:', error)
      toast.error('Failed to process barcodes')
    } finally {
      setProcessing(false)
    }
  }

  // Clear all results
  const clearResults = () => {
    stopCameraStream()
    setCodes(new Set())
    setDetectedBooks([])
    setUploadedImage(null)
    setProcessing(false)
    scannedRef.current = new Map()
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast('Results cleared')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">📷 Shelf Scanner</h2>

        {loadError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
            <p className="font-medium">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
            >
              Refresh page
            </button>
          </div>
        ) : (
          <>
            {/* Image Upload */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">📁 Upload Shelf Image</h3>
              <div className="flex items-center space-x-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  📤 Choose Image
                </label>
                {processing && <span className="text-gray-600">🔄 Processing image...</span>}
              </div>
              {uploadedImage && (
                <div className="mt-4">
                  <img src={uploadedImage} alt="Uploaded shelf" className="max-w-md rounded-lg shadow-md" />
                </div>
              )}
            </div>

            {/* Live Camera Scan */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">📹 Live Camera Scan</h3>
              
              {/* Camera Selection */}
              {availableCameras.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📷 Select Camera:
                  </label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableCameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Camera ${camera.deviceId}`}
                        {camera.label && camera.label.toLowerCase().includes('usb') && ' 📹 USB'}
                        {camera.label && camera.label.toLowerCase().includes('external') && ' 📹 External'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-4">
                <video ref={videoRef} width="400" height="300" className="rounded-lg shadow-md bg-gray-900" />
                <div className="flex space-x-4">
                  {!scanning ? (
                    <button
                      onClick={startCameraScan}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ▶️ Start Scan
                    </button>
                  ) : (
                    <button
                      onClick={stopCameraScan}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ⏹️ Stop Scan
                    </button>
                  )}
                  <button
                    onClick={clearResults}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    🗑️ Clear Results
                  </button>
                </div>
              </div>
            </div>

            {/* Detected Codes */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">📊 Detected Barcodes ({codes.size})</h3>
              
              {/* Debug: Show actual codes content */}
              <div className="text-xs text-gray-400 mb-2">
                Debug: Codes = {[...codes].join(', ')}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {codes.size > 0 ? (
                  [...codes].map((code, index) => (
                    <div key={`${code}-${index}`} className="flex items-center justify-between p-2 bg-white rounded border mb-2">
                      <span className="font-mono text-sm font-bold">{code}</span>
                      <span className="text-xs text-gray-500">Barcode #{index + 1}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No barcodes detected yet. Upload an image or start camera scan.
                  </p>
                )}
              </div>
            </div>

            {/* Detected Books */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">📚 Detected Books ({detectedBooks.length})</h3>
              <div className="space-y-4">
                {detectedBooks.length > 0 ? (
                  detectedBooks.map((book) => (
                    <div key={book._id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{book.title}</h4>
                          <p className="text-sm text-gray-600">Author: {book.author}</p>
                          <p className="text-sm text-gray-600">Acc No: {book.accNo}</p>
                          <p className="text-sm text-gray-600">Department: {book.department}</p>
                          <p className="text-sm text-gray-600">Year: {book.publishedYear}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            book.status === 'Available'
                              ? 'bg-green-100 text-green-800'
                              : book.status === 'Issued'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {book.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No books detected yet. Scan barcodes to find books.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ShelfScanner;