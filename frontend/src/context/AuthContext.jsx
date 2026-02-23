import React, { createContext, useContext, useReducer, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Set up Axios interceptor to include JWT token in all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

const AuthContext = createContext()

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return { ...state, loading: true, error: null }
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        user: action.payload.user,
        isAuthenticated: true,
        error: null 
      }
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return { 
        ...state, 
        loading: false, 
        user: null,
        isAuthenticated: false,
        error: action.payload 
      }
    case 'LOGOUT':
      return { 
        ...state, 
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null 
      }
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload,
        isAuthenticated: true,
        loading: false 
      }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me')
        dispatch({ type: 'SET_USER', payload: response.data.data.user })
      } catch (error) {
        dispatch({ type: 'LOGOUT' })
      }
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    try {
      dispatch({ type: 'LOGIN_START' })
      const response = await axios.post('/api/auth/login', { email, password })
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.data })
      toast.success('Login successful!')
      return response.data.data.user
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'LOGIN_FAILURE', payload: message })
      toast.error(message)
      throw error
    }
  }

  const register = async (name, email, password, role) => {
    try {
      dispatch({ type: 'REGISTER_START' })
      const response = await axios.post('/api/auth/register', { name, email, password, role })
      dispatch({ type: 'REGISTER_SUCCESS', payload: response.data.data })
      toast.success('Registration successful!')
      return response.data.data.user
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'REGISTER_FAILURE', payload: message })
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      dispatch({ type: 'LOGOUT' })
      toast.success('Logged out successfully')
    }
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
