import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import ManageComments from './ManageComments.jsx'
import ImageUpload from './ImageUpload.jsx'
import ManageUsers from './ManageUsers.jsx'

const API = 'http://localhost:5000/api/posts'

function editorContent(value = '') {
  if (/<\/?[a-z][\s\S]*>/i.test(value)) {
    return DOMPurify.sanitize(value)
  }

  return value.split('\n').map((line) => {
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    return `<p>${escaped}</p>`
  }).join('')
}

function AdminDashboard({ session, onLogout }) {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('Development')
  const [tags, setTags] = useState('')
  const [image, setImage] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        id: 'post-content',
        'aria-label': 'Article content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
  })

  const locked = busy || imageUploading

  useEffect(() => {
    editor?.setEditable(!locked)
  }, [editor, locked])

  useEffect(() => {
    const controller = new AbortController()

    async function loadPosts() {
      try {
        const response = await fetch(API, {
          signal: controller.signal,
        })

        if (!response.ok) throw new Error('Unable to load posts')
        setPosts(await response.json())
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Unable to load posts. Check the backend.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPosts()
    return () => controller.abort()
  }, [])

  function clearForm() {
    setEditingId(null)
    setTitle('')
    setExcerpt('')
    setCategory('Development')
    setTags('')
    setImage('')
    editor?.commands.clearContent()
  }

  async function readResponse(response) {
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  function showError(err) {
    setError(
      err instanceof TypeError
        ? 'Cannot connect to backend.'
        : err.message
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (locked) return

    setError('')
    setSuccess('')

    if (!editor || !editor.getText().trim()) {
      setError('Write some article content first.')
      return
    }

    const tagList = [...new Set(
      tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    )]

    if (tagList.length > 10 || tagList.some((tag) => tag.length > 30)) {
      setError('Use up to 10 tags, each up to 30 characters.')
      return
    }

    setBusy(true)
    const isEditing = Boolean(editingId)

    try {
      const response = await fetch(
        isEditing ? `${API}/${editingId}` : API,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            title,
            excerpt,
            category,
            image,
            tags: tagList,
            content: DOMPurify.sanitize(editor.getHTML()),
          }),
        }
      )

      const data = await readResponse(response)

      setPosts((previous) =>
        isEditing
          ? previous.map((post) => post._id === data._id ? data : post)
          : [data, ...previous]
      )

      clearForm()
      setSuccess(isEditing ? 'Post updated!' : 'Post published!')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function editPost(id) {
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const data = await readResponse(await fetch(`${API}/${id}`))

      setEditingId(data._id)
      setTitle(data.title)
      setExcerpt(data.excerpt)
      setCategory(data.category)
      setTags((data.tags || []).join(', '))
      setImage(data.image || '')
      editor?.commands.setContent(editorContent(data.content), {
        emitUpdate: false,
      })

      document.getElementById('post-title')?.focus()
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete "${post.title}" permanently?`)) return

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      await readResponse(await fetch(`${API}/${post._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      }))

      setPosts((previous) =>
        previous.filter((item) => item._id !== post._id)
      )

      if (editingId === post._id) clearForm()
      setSuccess('Post deleted!')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="site">
      <header className="header">
        <span className="brand">inkspace.</span>
        <button className="back-button" onClick={onLogout} disabled={locked}>
          Log out
        </button>
      </header>

      <main className="article-page">
        <span className="eyebrow">ADMIN PANEL</span>
        <h1>Welcome, {session.user.name}!</h1>
        <h2>{editingId ? 'Edit article' : 'Create an article'}</h2>

        {error && <p className="login-error" role="alert">{error}</p>}
        {success && <p className="publish-success" role="status">{success}</p>}

        <form className="login-form" onSubmit={handleSubmit}>
          <fieldset className="editor-fields" disabled={busy}>
            <label htmlFor="post-title">Post title</label>
            <input
              id="post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />

            <label htmlFor="post-category">Category</label>
            <select
              id="post-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Development</option>
              <option>Lifestyle</option>
              <option>Design</option>
            </select>

            <label htmlFor="post-tags">Tags (separate with commas)</label>
            <input
              id="post-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="React, JavaScript, Learning"
              maxLength={320}
            />

            <ImageUpload
              token={session.token}
              image={image}
              onChange={setImage}
              onBusyChange={setImageUploading}
            />

            <label htmlFor="post-excerpt">Short summary</label>
            <textarea
              id="post-excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              maxLength={500}
              rows={3}
              required
            />

            <span>Article content</span>

            <div className="rich-editor">
              <div className="editor-toolbar" role="group" aria-label="Text formatting">
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().toggleBold().run()}>
                  Bold
                </button>
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().toggleItalic().run()}>
                  Italic
                </button>
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  Heading
                </button>
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  Bullets
                </button>
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  Numbered list
                </button>
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().undo().run()}>
                  Undo
                </button>
                <button type="button" disabled={locked || !editor}
                  onClick={() => editor.chain().focus().redo().run()}>
                  Redo
                </button>
              </div>

              <EditorContent editor={editor} />
            </div>

            <button
              className="primary-button login-submit"
              type="submit"
              disabled={locked || !editor}
            >
              {imageUploading
                ? 'Uploading image...'
                : busy
                  ? 'Please wait...'
                  : editingId
                    ? 'Save changes'
                    : 'Publish post'}
            </button>

            {editingId && (
              <button type="button" className="back-button"
                disabled={locked} onClick={clearForm}>
                Cancel editing
              </button>
            )}
          </fieldset>
        </form>

        <section className="manage-posts">
          <h2>Manage articles ({posts.length})</h2>

          {loading && <p role="status">Loading articles...</p>}
          {!loading && !error && posts.length === 0 && <p>No articles yet.</p>}

          {posts.map((post) => (
            <div className="manage-post-row" key={post._id}>
              <div>
                <h3>{post.title}</h3>
                <span className="category-label">{post.category}</span>
                <p>{(post.tags || []).join(' · ')}</p>
              </div>
              <div className="post-actions">
                <button className="edit-button" type="button"
                  disabled={locked || !editor} onClick={() => editPost(post._id)}>
                  Edit
                </button>
                <button className="delete-button" type="button"
                  disabled={locked} onClick={() => deletePost(post)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>

        <ManageComments token={session.token} />
        <ManageUsers token={session.token} />
      </main>
    </div>
  )
}

export default AdminDashboard