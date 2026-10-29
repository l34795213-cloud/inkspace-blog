const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password ||
    email.length > 254 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      message: 'Enter a valid email and password',
    })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: 'Login is not configured',
    })
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password')

    const matches =
      user && (await bcrypt.compare(password, user.password))

    if (!matches || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const token = jwt.sign(
      { sub: user._id.toString() },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '2h' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login failed:', error.name)
    res.status(500).json({ message: 'Unable to log in' })
  }
})

module.exports = router