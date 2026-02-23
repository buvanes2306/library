// Simple test without axios
async function testLogin() {
  try {
    console.log('🔍 Testing login with buvanese23@gmail.com...')
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buvanese23@gmail.com',
        password: 'buvanes'
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Login successful!')
      console.log('User:', data.data.user)
      console.log('Token:', data.data.token.substring(0, 50) + '...')
      console.log('Role:', data.data.user.role)
    } else {
      console.log('❌ Login failed!')
      console.log('Message:', data.message)
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

testLogin()
