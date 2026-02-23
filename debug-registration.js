// Debug registration issues
import mongoose from 'mongoose';

async function debugRegistration() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect('mongodb+srv://buvanese23:mokeshprabu@cluster0.iqo4vu3.mongodb.net/librarydb');
    console.log('✅ Connected to MongoDB');

    // Check existing users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('📋 Existing users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role}) - ${user.name}`);
    });

    // Test creating a new user
    const testUser = {
      name: 'Test User',
      email: 'testuser' + Date.now() + '@example.com',
      password: 'password123',
      role: 'viewer'
    };

    console.log('\n🧪 Testing user creation with:', testUser);

    // Check if email already exists
    const existingUser = await mongoose.connection.db.collection('users').findOne({ email: testUser.email });
    if (existingUser) {
      console.log('❌ Email already exists:', existingUser.email);
    } else {
      console.log('✅ Email is available');
      
      // Try to create user
      try {
        const result = await mongoose.connection.db.collection('users').insertOne(testUser);
        console.log('✅ User created successfully:', result.insertedId);
      } catch (createError) {
        console.log('❌ Error creating user:', createError.message);
      }
    }

    // Check final user count
    const finalUsers = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('\n📊 Final user count:', finalUsers.length);

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

debugRegistration();
