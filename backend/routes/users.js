const express = require('express')
const bcrypt = require('bcryptjs')
const User = require('../models/user')
const requireAdmin = require('../middleware/auth')

const router = express.Router()

router.use(requireAdmin)

// List users without passwords
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(200)

    res.json(users)
  } catch {
    res.status(500).json({ message: 'Unable to load users' })
  }
})

// Create a regular user
router.post('/', async (req, res) => {
  const { name, email, password } = req.body || {}

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== 'string' ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      message: 'Enter a name, valid email, and password of at least 12 characters (maximum 72 bytes)',
    })
  }

  try {
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
      role: 'user',
    })

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      message: error.code === 11000
        ? 'Email already exists'
        : 'Unable to create user',
    })
  }
})

// Enable or disable regular users
router.patch('/:id', async (req, res) => {
  if (
    !/^[a-f\d]{24}$/i.test(req.params.id) ||
    typeof req.body?.isActive !== 'boolean'
  ) {
    return res.status(400).json({ message: 'Invalid request' })
  }

  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Admin accounts cannot be disabled here',
      })
    }

    user.isActive = req.body.isActive
    await user.save()

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
  } catch {
    res.status(500).json({ message: 'Unable to update user' })
  }
})

module.exports = router