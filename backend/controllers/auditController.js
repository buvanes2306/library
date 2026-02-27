import AuditSession from '../models/AuditSession.js'
import AuditReport from '../models/AuditReport.js'
import Book from '../models/Book.js'

// Start audit session
export const startAuditSession = async (req, res) => {
  try {
    const { auditor } = req.body
    
    if (!auditor) {
      return res.status(400).json({ message: 'Auditor name is required' })
    }

    // Generate unique session ID
    const sessionId = 'AUDIT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    const auditSession = new AuditSession({
      sessionId,
      auditor,
      status: 'active'
    })

    await auditSession.save()

    res.status(201).json({
      message: 'Audit session started successfully',
      sessionId,
      auditor
    })
  } catch (error) {
    console.error('Start audit session error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Scan shelf - compare expected vs actual books
export const scanShelf = async (req, res) => {
  try {
    const { sessionId, rack, shelf, scannedCodes } = req.body
    
    if (!sessionId || !rack || !shelf || !scannedCodes) {
      return res.status(400).json({ message: 'Session ID, rack, shelf, and scanned codes are required' })
    }

    // Get audit session
    const auditSession = await AuditSession.findOne({ sessionId, status: 'active' })
    if (!auditSession) {
      return res.status(404).json({ message: 'Audit session not found or expired' })
    }

    // Get expected books for this rack+shelf based on Book.locationRack and Book.shelf
    const expectedBooks = await Book.find({ 
      locationRack: rack,
      shelf: shelf
    }).select('bookId accNo title author locationRack shelf')

    // Process each scanned code
    const auditReports = []
    let booksFound = 0
    let booksMissing = 0
    let booksMisplaced = 0

    for (const scannedCode of scannedCodes) {
      const expectedBook = expectedBooks.find(book => book.bookId === scannedCode)
      
      if (expectedBook) {
        // Book found in correct location
        booksFound++
        auditReports.push({
          auditSessionId: auditSession._id,
          bookId: expectedBook.bookId,
          accNo: expectedBook.accNo,
          title: expectedBook.title,
          author: expectedBook.author,
          expectedRack: parseInt(rack),
          expectedShelf: parseInt(shelf),
          actualRack: parseInt(rack),
          actualShelf: parseInt(shelf),
          status: 'found'
        })
      } else {
        // Book not found in expected location - check if it exists elsewhere
        const misplacedBook = await Book.findOne({ bookId: scannedCode })
        
        if (misplacedBook) {
          // Book exists but in wrong location
          booksMisplaced++
          const actualRack = Number(misplacedBook.locationRack) || 0
          const actualShelf = Number(misplacedBook.shelf) || 0

          auditReports.push({
            auditSessionId: auditSession._id,
            bookId: misplacedBook.bookId,
            accNo: misplacedBook.accNo,
            title: misplacedBook.title,
            author: misplacedBook.author,
            expectedRack: Number(rack) || 0,
            expectedShelf: Number(shelf) || 0,
            actualRack,
            actualShelf,
            status: 'misplaced',
            notes: `Expected at Rack ${rack}, Shelf ${shelf} but found at Rack ${misplacedBook.locationRack || 'unknown'}, Shelf ${misplacedBook.shelf || 'unknown'}`
          })
        } else {
          // Book doesn't exist at all
          booksMissing++
          const numericRack = Number(rack) || 0
          const numericShelf = Number(shelf) || 0

          auditReports.push({
            auditSessionId: auditSession._id,
            bookId: scannedCode,
            accNo: 'N/A',
            title: 'N/A',
            author: 'N/A',
            expectedRack: numericRack,
            expectedShelf: numericShelf,
            // For completely unknown books, record the location where they were scanned
            actualRack: numericRack,
            actualShelf: numericShelf,
            status: 'missing',
            notes: 'Book not found in library database'
          })
        }
      }
    }

    // Save all audit reports
    await AuditReport.insertMany(auditReports)

    // Update audit session stats
    auditSession.totalBooksScanned += scannedCodes.length
    auditSession.booksFound += booksFound
    auditSession.booksMissing += booksMissing
    auditSession.booksMisplaced += booksMisplaced
    await auditSession.save()

    res.status(200).json({
      message: 'Shelf scanned successfully',
      sessionId,
      rack,
      shelf,
      scannedCodes: scannedCodes.length,
      booksFound,
      booksMissing,
      booksMisplaced,
      expectedBooks: expectedBooks.length,
      summary: {
        totalScanned: auditSession.totalBooksScanned,
        totalFound: auditSession.booksFound,
        totalMissing: auditSession.booksMissing,
        totalMisplaced: auditSession.booksMisplaced
      }
    })
  } catch (error) {
    console.error('Scan shelf error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Finalize audit session
export const finalizeAudit = async (req, res) => {
  try {
    const { sessionId, notes } = req.body
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' })
    }

    // Get audit session
    const auditSession = await AuditSession.findOne({ sessionId })
    if (!auditSession) {
      return res.status(404).json({ message: 'Audit session not found' })
    }

    if (auditSession.status !== 'active') {
      return res.status(400).json({ message: 'Audit session already finalized' })
    }

    // Mark books still missing as lost
    // Need all fields required by AuditReport (bookId, accNo, title, author, rack/shelf)
    const expectedBooks = await Book.find({}).select('bookId accNo title author locationRack shelf')
    const scannedReports = await AuditReport.find({ auditSessionId: auditSession._id })
    const scannedBookIds = scannedReports.map(report => report.bookId)

    // Find books that were never scanned and mark as lost
    const lostBooks = expectedBooks.filter(book => 
      !scannedBookIds.includes(book.bookId)
    )

    for (const lostBook of lostBooks) {
      const expectedRack = Number(lostBook.locationRack) || 0
      const expectedShelf = Number(lostBook.shelf) || 0

      await AuditReport.create({
        auditSessionId: auditSession._id,
        bookId: lostBook.bookId,
        accNo: lostBook.accNo,
        title: lostBook.title,
        author: lostBook.author,
        expectedRack,
        expectedShelf,
        // For lost books, we only know where they should be; record same as expected
        actualRack: expectedRack,
        actualShelf: expectedShelf,
        status: 'missing',
        notes: 'Book not found during audit - marked as lost'
      })
    }

    // Update book statuses to 'lost'
    await Book.updateMany(
      { bookId: { $in: lostBooks.map(book => book.bookId) } },
      { status: 'Lost' }
    )

    // Finalize audit session
    auditSession.status = 'completed'
    auditSession.endTime = Date.now()
    auditSession.notes = notes || auditSession.notes
    await auditSession.save()

    res.status(200).json({
      message: 'Audit session finalized successfully',
      sessionId,
      summary: {
        totalScanned: auditSession.totalBooksScanned,
        totalFound: auditSession.booksFound,
        totalMissing: auditSession.booksMissing + lostBooks.length,
        totalMisplaced: auditSession.booksMisplaced,
        booksMarkedLost: lostBooks.length
      },
      duration: auditSession.endTime - auditSession.startTime
    })
  } catch (error) {
    console.error('Finalize audit error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get audit report
export const getAuditReport = async (req, res) => {
  try {
    const { auditSessionId } = req.params
    
    if (!auditSessionId) {
      return res.status(400).json({ message: 'Audit session ID is required' })
    }

    // Get audit session
    const auditSession = await AuditSession.findOne({ sessionId: auditSessionId })
    if (!auditSession) {
      return res.status(404).json({ message: 'Audit session not found' })
    }

    // Get all audit reports for this session
    const auditReports = await AuditReport.find({ auditSessionId: auditSession._id })
      .sort({ scannedAt: 1 })

    res.status(200).json({
      auditSession,
      reports: auditReports,
      summary: {
        totalScanned: auditSession.totalBooksScanned,
        totalFound: auditSession.booksFound,
        totalMissing: auditSession.booksMissing,
        totalMisplaced: auditSession.booksMisplaced
      }
    })
  } catch (error) {
    console.error('Get audit report error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Get all audit sessions
export const getAuditSessions = async (req, res) => {
  try {
    const sessions = await AuditSession.find({})
      .sort({ startTime: -1 })
      .limit(50) // Last 50 sessions

    res.status(200).json({
      sessions,
      total: sessions.length
    })
  } catch (error) {
    console.error('Get audit sessions error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  startAuditSession,
  scanShelf,
  finalizeAudit,
  getAuditReport,
  getAuditSessions
}
