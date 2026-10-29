import { useEffect, useState } from 'react'

const API = 'http://localhost:5000/api/users'

function ManageUsers({ token }) {
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(API, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load users')
        }

        setUsers(data)
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [token])

  async function request(url, method, body) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  async function addUser(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const user = await request(API, 'POST', {
        name, email, password,
      })

      setUsers((previous) => [user, ...previous])
      setName('')
      setEmail('')
      setPassword('')
      setSuccess('User created successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleUser(user) {
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const updated = await request(`${API}/${user._id}`, 'PATCH', {
        isActive: !user.isActive,
      })

      setUsers((previous) =>
        previous.map((item) =>
          item._id === updated._id ? updated : item
        )
      )

      setSuccess('User access updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="manage-posts">
      <h2>Manage users ({users.length})</h2>

      {error && <p className="login-error" role="alert">{error}</p>}
      {success && <p className="publish-success" role="status">{success}</p>}

      <form className="login-form" onSubmit={addUser}>
        <fieldset className="editor-fields" disabled={busy}>
          <label htmlFor="new-user-name">User name</label>
          <input
            id="new-user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />

          <label htmlFor="new-user-email">Email</label>
          <input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />

          <label htmlFor="new-user-password">
            Password (at least 12 characters)
          </label>
          <input
            id="new-user-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            required
          />

          <button className="primary-button login-submit" type="submit">
            {busy ? 'Please wait...' : 'Add user'}
          </button>
        </fieldset>
      </form>

      {loading && <p role="status">Loading users...</p>}

      {users.map((user) => (
        <div className="manage-post-row" key={user._id}>
          <div>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span className="category-label">
              {user.role} · {user.isActive ? 'Active' : 'Disabled'}
            </span>
          </div>

          {user.role !== 'admin' && (
            <button
              type="button"
              className={user.isActive ? 'delete-button' : 'edit-button'}
              disabled={busy}
              onClick={() => toggleUser(user)}
            >
              {user.isActive ? 'Disable access' : 'Enable access'}
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

export default ManageUsers