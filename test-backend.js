// Test backend health
async function testBackend() {
  try {
    console.log('🔍 Testing backend health...')
    
    const response = await fetch('http://localhost:5000/api/health')
    const data = await response.json()
    
    console.log('✅ Backend health:', data)
  } catch (error) {
    console.log('❌ Backend error:', error.message)
  }
}

testBackend()
