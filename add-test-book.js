// Test script to add a sample book
import axios from 'axios';

const testBook = {
  accNo: 'TEST001',
  title: 'Test Book for Library',
  author: 'Test Author',
  publisher: 'Test Publisher',
  publishedYear: 2023,
  department: 'Computer Science',
  status: 'Available',
  locationRack: 'A1',
  shelf: '1',
  callNumber: '005.1/TEST',
  edition: '1st Edition',
  numberOfCopies: 2,
  isbn: '978-0-123456-78-9',
  description: 'This is a test book added to verify the system is working properly.'
};

const addTestBook = async () => {
  try {
    console.log('Adding test book...');
    
    // First login to get auth token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Login successful:', loginResponse.data);
    
    // Add the book
    const bookResponse = await axios.post('http://localhost:5000/api/books', testBook, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('Book added successfully:', bookResponse.data);
    
    // Fetch all books to verify
    const booksResponse = await axios.get('http://localhost:5000/api/books');
    console.log('Total books in database:', booksResponse.data.data.pagination.total);
    console.log('Books:', booksResponse.data.data.books.map(b => ({ title: b.title, accNo: b.accNo })));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

addTestBook();
