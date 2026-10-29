const dns = require('node:dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

require('dotenv').config({
  path: require('node:path').join(__dirname, '..', '.env'),
})

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

async function resetAdmin() {
  try {
    const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

    if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('Required values are missing in backend/.env')
    }

    if (
      ADMIN_PASSWORD.length < 12 ||
      Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72
    ) {
      throw new Error('Password must be at least 12 characters and at most 72 bytes')
    }

    await mongoose.connect(MONGO_URI, {
      dbName: 'inkspace',
      serverSelectionTimeoutMS: 10000,
    })

    const user = await User.findOne({
      email: ADMIN_EMAIL.trim().toLowerCase(),
    })

    if (!user) {
      throw new Error('No account found with ADMIN_EMAIL')
    }

    if (user.role !== 'admin') {
      throw new Error('This account is not an admin')
    }

    if (!user.isActive) {
      throw new Error('This account is inactive')
    }

    user.password = await bcrypt.hash(ADMIN_PASSWORD, 12)
    await user.save()

    console.log('Admin password reset successfully')
  } catch (error) {
    console.error('Password reset failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

resetAdmin()