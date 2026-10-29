const express = require('express')
const Post = require('../models/post')
const requireAdmin = require('../middleware/auth')

const router = express.Router()
const categories = ['Development', 'Lifestyle', 'Design']

function validId(id) {
  return /^[a-f\d]{24}$/i.test(id)
}

function validatePost(body) {
  const {
    title,
    excerpt,
    content,
    category,
    image = '',
    tags = [],
  } = body || {}

  // Check uploaded image path
  const validImagePath = new RegExp(
    '^/uploads/[a-f0-9-]{36}[.]webp$'
  )

  if (
    typeof image !== 'string' ||
    (image !== '' && !validImagePath.test(image))
  ) {
    return { error: 'Invalid cover image' }
  }

  // Check tags
  if (
    !Array.isArray(tags) ||
    tags.length > 10 ||
    tags.some((tag) =>
      typeof tag !== 'string' ||
      !tag.trim() ||
      tag.trim().length > 30
    )
  ) {
    return {
      error: 'Use up to 10 tags, each up to 30 characters',
    }
  }

  // Check article fields
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 200 ||
    typeof excerpt !== 'string' ||
    !excerpt.trim() ||
    excerpt.trim().length > 500 ||
    typeof content !== 'string' ||
    !content.trim() ||
    !categories.includes(category)
  ) {
    return {
      error:
        'Enter a title (up to 200 characters), summary (up to 500), content, and valid category',
    }
  }

  return {
    values: {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      category,
      image,
      tags: [...new Set(tags.map((tag) => tag.trim()))],
    },
  }
}

// List posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .select('-content')
      .sort({ createdAt: -1 })
      .limit(100)

    res.json(posts)
  } catch {
    res.status(500).json({ message: 'Unable to load posts' })
  }
})

// Read one post
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid post ID' })
  }

  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json(post)
  } catch {
    res.status(500).json({ message: 'Unable to load post' })
  }
})

// Create a post
router.post('/', requireAdmin, async (req, res) => {
  const result = validatePost(req.body)

  if (result.error) {
    return res.status(400).json({ message: result.error })
  }

  try {
    const post = await Post.create({
      ...result.values,
      author: req.user.name,
    })

    res.status(201).json(post)
  } catch {
    res.status(500).json({ message: 'Unable to create post' })
  }
})

// Edit a post
router.put('/:id', requireAdmin, async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid post ID' })
  }

  const result = validatePost(req.body)

  if (result.error) {
    return res.status(400).json({ message: result.error })
  }

  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: result.values },
      { new: true, runValidators: true }
    )

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json(post)
  } catch {
    res.status(500).json({ message: 'Unable to update post' })
  }
})

// Delete a post
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid post ID' })
  }

  try {
    const post = await Post.findByIdAndDelete(req.params.id)

    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json({ message: 'Post deleted successfully' })
  } catch {
    res.status(500).json({ message: 'Unable to delete post' })
  }
})

module.exports = router