import { useEffect, useState } from 'react'

function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadComments() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `http://localhost:5000/api/comments/${postId}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error('Unable to load comments')
        }

        const data = await response.json()
        setComments(data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Unable to load comments. Check the backend.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadComments()
    return () => controller.abort()
  }, [postId])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/comments/${postId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, message }),
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Unable to save comment')
      }

      const comment = await response.json()

      setComments((previous) => [comment, ...previous])
      setMessage('')
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to backend.'
          : err.message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="comments-section">
      <h2>Comments ({comments.length})</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="comment-name">Your name</label>
        <input
          id="comment-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoComplete="name"
          required
        />

        <label htmlFor="comment-message">Your comment</label>
        <textarea
          id="comment-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          rows={4}
          required
        />

        <button
          className="primary-button login-submit"
          type="submit"
          disabled={saving || loading}
        >
          {saving ? 'Posting...' : 'Post comment'}
        </button>
      </form>

      {error && (
        <p className="login-error" role="alert">{error}</p>
      )}

      {loading && <p role="status">Loading comments...</p>}

      {!loading && !error && comments.length === 0 && (
        <p>Be the first to leave a comment.</p>
      )}

      <div aria-live="polite">
        {comments.map((comment) => (
          <article className="comment-card" key={comment._id}>
            <strong>{comment.name}</strong>
            <time dateTime={comment.createdAt}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </time>
            <p>{comment.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Comments