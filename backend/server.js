
const dns = require('node:dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const app = express()
const PORT = process.env.PORT || 5000
const path = require('node:path')
app.use('/api/users', require('./routes/users'))

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'deny',
  })
)

app.use('/api/uploads', require('./routes/uploads'))
app.use('/api/posts', require('./routes/post'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/comments', require('./routes/comments'))

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Inkspace backend is running',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in backend/.env')
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'inkspace',
      serverSelectionTimeoutMS: 10000,
    })

    console.log('MongoDB connected successfully')

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`)
    })
   } catch (error) {
    console.error('MongoDB error type:', error.name)
    console.error('MongoDB error code:', error.code)
    console.error('MongoDB error:', error.message)
    process.exit(1)
  }
}

startServer()