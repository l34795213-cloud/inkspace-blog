import { useEffect, useState } from 'react'

const API = 'http://localhost:5000/api/comments'

function ManageComments({ token }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadComments() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API}/admin/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.message || 'Unable to load comments')
        }

        const data = await response.json()
        setComments(data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(
            err instanceof TypeError
              ? 'Cannot connect to backend.'
              : err.message
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadComments()
    return () => controller.abort()
  }, [token])

  async function deleteComment(comment) {
    if (!window.confirm('Delete this comment permanently?')) return

    setDeletingId(comment._id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API}/${comment._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Unable to delete comment')
      }

      setComments((previous) =>
        previous.filter((item) => item._id !== comment._id)
      )

      setSuccess('Comment deleted successfully.')
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to backend.'
          : err.message
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="manage-posts">
      <h2>Manage comments ({comments.length})</h2>

      {loading && <p role="status">Loading comments...</p>}

      {error && (
        <p className="login-error" role="alert">{error}</p>
      )}

      {success && (
        <p className="publish-success" role="status">{success}</p>
      )}

      {!loading && !error && comments.length === 0 && (
        <p>No comments yet.</p>
      )}

      {comments.map((comment) => (
        <article className="comment-card" key={comment._id}>
          <strong>{comment.name}</strong>

          <p className="category-label">
            Article: {comment.post?.title || 'Deleted article'}
          </p>

          <p>{comment.message}</p>

          <button
            type="button"
            className="delete-button"
            disabled={deletingId !== null}
            onClick={() => deleteComment(comment)}
          >
            {deletingId === comment._id
              ? 'Deleting...'
              : 'Delete comment'}
          </button>
        </article>
      ))}
    </section>
  )
}

export default ManageComments