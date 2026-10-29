const dns = require('node:dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

require('dotenv').config({
  path: require('node:path').join(__dirname, '..', '.env'),
})

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

async function createAdmin() {
  try {
    const {
      MONGO_URI,
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    } = process.env

    if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('Required values are missing in backend/.env')
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error('Admin password must have at least 12 characters')
    }

    if (Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72) {
      throw new Error('Admin password must not exceed 72 bytes')
    }

    await mongoose.connect(MONGO_URI, {
      dbName: 'inkspace',
      serverSelectionTimeoutMS: 10000,
    })

    const email = ADMIN_EMAIL.trim().toLowerCase()
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      console.log('Account already exists. No changes made.')
      return
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

    await User.create({
      name: ADMIN_NAME,
      email,
      password: passwordHash,
      role: 'admin',
    })

    console.log('Admin account created successfully')
  } catch (error) {
    console.error('Admin setup failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

createAdmin()