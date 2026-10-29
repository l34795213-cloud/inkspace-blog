const jwt = require('jsonwebtoken')
const User = require('../models/user')

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Please log in' })
  }

  let payload

  try {
    payload = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    )
  } catch {
    return res.status(401).json({
      message: 'Session expired. Please log in again',
    })
  }

  if (
    typeof payload.sub !== 'string' ||
    !/^[a-f\d]{24}$/i.test(payload.sub)
  ) {
    return res.status(401).json({ message: 'Invalid session' })
  }

  try {
    const user = await User.findById(payload.sub)

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account unavailable' })
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    req.user = user
    next()
  } catch {
    res.status(500).json({ message: 'Unable to verify account' })
  }
}

module.exports = requireAdmin