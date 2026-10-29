const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const path = require('node:path')
const fs = require('node:fs/promises')
const { randomUUID } = require('node:crypto')
const requireAdmin = require('../middleware/auth')

const router = express.Router()

const uploadDirectory = path.join(__dirname, '..', 'uploads')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
})

router.post('/', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      return res.status(400).json({
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be smaller than 5 MB'
            : 'Upload one image using the image field',
      })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image' })
    }

    let imageBuffer

    try {
      const image = sharp(req.file.buffer, {
        limitInputPixels: 25000000,
        failOn: 'warning',
      })

      const metadata = await image.metadata()

      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
        return res.status(400).json({
          message: 'Use a JPG, PNG, or WebP image',
        })
      }

      imageBuffer = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1000,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer()
    } catch {
      return res.status(400).json({
        message: 'Unable to read image. Choose a valid JPG, PNG, or WebP file',
      })
    }

    try {
      await fs.mkdir(uploadDirectory, { recursive: true })

      const filename = `${randomUUID()}.webp`

      await fs.writeFile(
        path.join(uploadDirectory, filename),
        imageBuffer
      )

      res.status(201).json({
        image: `/uploads/${filename}`,
      })
    } catch {
      res.status(500).json({ message: 'Unable to save image' })
    }
  })
})

module.exports = router