const express = require('express')
const Comment = require('../models/comment')
const Post = require('../models/post')
const requireAdmin = require('../middleware/auth')

const router = express.Router()

function validId(id) {
  return /^[a-f\d]{24}$/i.test(id)
}
// List all comments — admin only
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(200)

    res.json(comments)
  } catch {
    res.status(500).json({ message: 'Unable to load comments' })
  }
})
// Read comments for an article
router.get('/:postId', async (req, res) => {
  const { postId } = req.params

  if (!validId(postId)) {
    return res.status(400).json({ message: 'Invalid article ID' })
  }

  try {
    const postExists = await Post.exists({ _id: postId })

    if (!postExists) {
      return res.status(404).json({ message: 'Article not found' })
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .limit(100)

    res.json(comments)
  } catch {
    res.status(500).json({ message: 'Unable to load comments' })
  }
})

// Add a comment to an article
router.post('/:postId', async (req, res) => {
  const { postId } = req.params
  const { name, message } = req.body || {}

  if (!validId(postId)) {
    return res.status(400).json({ message: 'Invalid article ID' })
  }

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 80 ||
    typeof message !== 'string' ||
    !message.trim() ||
    message.trim().length > 1000
  ) {
    return res.status(400).json({
      message: 'Enter your name and a comment of up to 1000 characters',
    })
  }

  try {
    const postExists = await Post.exists({ _id: postId })

    if (!postExists) {
      return res.status(404).json({ message: 'Article not found' })
    }

    const comment = await Comment.create({
      post: postId,
      name: name.trim(),
      message: message.trim(),
    })

    res.status(201).json(comment)
  } catch {
    res.status(500).json({ message: 'Unable to save comment' })
  }
})
// Delete a comment — admin only
router.delete('/:commentId', requireAdmin, async (req, res) => {
  const { commentId } = req.params

  if (!validId(commentId)) {
    return res.status(400).json({ message: 'Invalid comment ID' })
  }

  try {
    const comment = await Comment.findByIdAndDelete(commentId)

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    res.json({ message: 'Comment deleted successfully' })
  } catch {
    res.status(500).json({ message: 'Unable to delete comment' })
  }
})
module.exports = router