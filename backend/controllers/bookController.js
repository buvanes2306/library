import mongoose from 'mongoose';
import Book from '../models/Book.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createBook = asyncHandler(async (req, res) => {
  const bookData = {
    ...req.body,
    addedBy: req.user.id
  };

  const book = await Book.create(bookData);
  await book.populate('addedBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Book added successfully',
    data: { book }
  });
});

export const getBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, department, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Log database connection
  console.log('📊 Database:', mongoose.connection.name);
  console.log('🔗 Connection state:', mongoose.connection.readyState);
  
  let query = {};

  if (search) {
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      // Convert search to number for numeric fields (accNo)
      const searchAsNumber = Number(trimmedSearch);
      const isNumericSearch = !isNaN(searchAsNumber) && trimmedSearch !== '';
      
      console.log('🔍 Search term:', trimmedSearch);
      console.log('🔍 Is numeric search:', isNumericSearch);
      console.log('🔍 searchAsNumber:', searchAsNumber);
      
      // Build OR conditions
      const orConditions = [];
      
      // Always add string-based searches
      const regexPattern = trimmedSearch;
      orConditions.push({ title: { $regex: regexPattern, $options: 'i' } });
      orConditions.push({ author: { $regex: regexPattern, $options: 'i' } });
      orConditions.push({ authors: { $regex: regexPattern, $options: 'i' } });
      orConditions.push({ publisher: { $regex: regexPattern, $options: 'i' } });
      orConditions.push({ department: { $regex: regexPattern, $options: 'i' } });
      
      // For numeric search, also search accNo as number using $expr to bypass Mongoose schema
      if (isNumericSearch) {
        // Use $expr with $toInt to compare numeric values
        orConditions.push({ $expr: { $eq: [{ $toInt: "$accNo" }, searchAsNumber] } });
        // Also add regex search for partial match (e.g., "4" should match "4281")
        orConditions.push({ accNo: { $regex: regexPattern, $options: 'i' } });
      } else {
        orConditions.push({ accNo: { $regex: regexPattern, $options: 'i' } });
      }
      
      query.$or = orConditions;
      console.log('🔍 Search query:', JSON.stringify(query, null, 2));
    }
  }

  if (department) {
    query.department = department;
  }

  if (status) {
    query.status = status;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const books = await Book.find(query)
    .populate('addedBy', 'name email')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const total = await Book.countDocuments(query);
  
  console.log('📚 Total books found:', total);
  console.log('📚 Books in this page:', books.length);

  res.json({
    success: true,
    data: {
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getBookById = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate('addedBy', 'name email');

  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found'
    });
  }

  res.json({
    success: true,
    data: { book }
  });
});

export const updateBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found'
    });
  }

  const updatedBook = await Book.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('addedBy', 'name email');

  res.json({
    success: true,
    message: 'Book updated successfully',
    data: { book: updatedBook }
  });
});

export const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found'
    });
  }

  await Book.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Book deleted successfully'
  });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalBooks, availableBooks, issuedBooks] = await Promise.all([
    Book.countDocuments(),
    Book.countDocuments({ status: 'Available' }),
    Book.countDocuments({ status: 'Issued' })
  ]);

  const recentBooks = await Book.find()
    .populate('addedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    data: {
      stats: {
        totalBooks,
        availableBooks,
        issuedBooks
      },
      recentBooks
    }
  });
});

export const getBookStats = asyncHandler(async (req, res) => {
  const stats = await Book.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const departmentStats = await Book.aggregate([
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalBooks = await Book.countDocuments();

  res.json({
    success: true,
    data: {
      totalBooks,
      statusStats: stats,
      departmentStats
    }
  });
});

export const updateBookStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['Available', 'Issued'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be Available or Issued'
    });
  }

  const book = await Book.findById(req.params.id);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found'
    });
  }

  const updatedBook = await Book.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('addedBy', 'name email');

  res.json({
    success: true,
    message: `Book status updated to ${status}`,
    data: { book: updatedBook }
  });
});
