import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Books from './pages/Books'
import BookDetail from './pages/BookDetail'
import AdminPanel from './pages/AdminPanel'
import Users from './pages/Users'
import ShelfScanner from './components/ShelfScanner'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dash" element={<Navigate to="/dashboard" />} />
        <Route path="books" element={<Books />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="scanner" element={<ShelfScanner />} />
        
        {user?.role === 'admin' && (
          <>
            <Route path="admin" element={<AdminPanel />} />
            <Route path="admin/:id" element={<AdminPanel />} />
            <Route path="users" element={<Users />} />
          </>
        )}
      </Route>
      
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App
