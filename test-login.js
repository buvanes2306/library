import axios from 'axios'

async function testLogin() {
  try {
    console.log('🔍 Testing login with buvanese23@gmail.com...')
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'buvanese23@gmail.com',
      password: 'buvanes'
    })
    
    console.log('✅ Login successful!')
    console.log('User:', response.data.data.user)
    console.log('Token:', response.data.data.token.substring(0, 50) + '...')
    console.log('Role:', response.data.data.user.role)
    
  } catch (error) {
    console.log('❌ Login failed!')
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Message:', error.response.data.message)
    } else {
      console.log('Error:', error.message)
    }
  }
}

testLogin()
