import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import './App.css'
import Login from './login.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import Comments from './comments.jsx'

const SERVER = 'http://localhost:5000'
const categories = ['All', 'Development', 'Lifestyle', 'Design']

function formatPost(post) {
  const appearance = {
    Development: { cover: '💻', color: 'purple' },
    Lifestyle: { cover: '🌱', color: 'green' },
    Design: { cover: '🎨', color: 'peach' },
  }

  return {
    ...post,
    id: post._id,
    tags: post.tags || [],
    date: new Date(post.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    ...(appearance[post.category] || appearance.Development),
  }
}

function ArticleContent({ content = '' }) {
  const looksLikeHtml = /<[a-z][^>]*>/i.test(content)

  if (!looksLikeHtml) {
    return (
      <div className="article-content">
        {content.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    )
  }

  const cleanHtml = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
    ],
    ALLOWED_ATTR: [],
  })

  return (
    <div
      className="article-content"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  )
}

function App() {
  const [showLogin, setShowLogin] = useState(false)
  const [session, setSession] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedPost, setSelectedPost] = useState(null)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [articleLoading, setArticleLoading] = useState(false)
  const [articleError, setArticleError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadPosts() {
      setPostsLoading(true)
      setPostsError('')

      try {
        const response = await fetch(`${SERVER}/api/posts`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load articles')
        }

        const data = await response.json()
        setPosts(data.map(formatPost))
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPostsError(
            'Unable to load articles. Check the backend connection.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setPostsLoading(false)
        }
      }
    }

    loadPosts()
    return () => controller.abort()
  }, [session])

  async function openPost(post) {
    setArticleLoading(true)
    setArticleError('')

    try {
      const response = await fetch(
        `${SERVER}/api/posts/${post.id}`
      )

      if (!response.ok) {
        throw new Error('Unable to open article')
      }

      const data = await response.json()
      setSelectedPost(formatPost(data))
      window.scrollTo({ top: 0 })
    } catch {
      setArticleError('Unable to open article. Please try again.')
    } finally {
      setArticleLoading(false)
    }
  }

  const availableTags = [
    ...new Set(posts.flatMap((post) => post.tags)),
  ].sort()

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      category === 'All' || post.category === category

    const matchesTag =
      selectedTag === '' || post.tags.includes(selectedTag)

    const searchText = [
      post.title,
      post.excerpt,
      post.category,
      ...post.tags,
    ].join(' ').toLowerCase()

    return (
      matchesCategory &&
      matchesTag &&
      searchText.includes(search.trim().toLowerCase())
    )
  })

  if (session) {
    return (
      <AdminDashboard
        session={session}
        onLogout={() => {
          setSession(null)
          setShowLogin(false)
          setSelectedPost(null)
          setSelectedTag('')
        }}
      />
    )
  }

  if (showLogin) {
    return (
      <Login
        onBack={() => setShowLogin(false)}
        onLogin={(data) => {
          setSession(data)
          setShowLogin(false)
        }}
      />
    )
  }

  return (
    <div className="site">
      <header className="header">
        <a className="brand" href="./">
          <span className="brand-icon">i</span>
          inkspace<span className="brand-dot">.</span>
        </a>

        <button
          className="back-button"
          onClick={() => setShowLogin(true)}
        >
          Admin login ↗
        </button>
      </header>

      <main>
        {selectedPost ? (
          <article className="article-page">
            <button
              className="back-button"
              onClick={() => setSelectedPost(null)}
            >
              ← Back to all articles
            </button>

            <div className={`article-cover ${selectedPost.color}`}>
              {selectedPost.image ? (
                <img
                  className="article-cover-image"
                  src={`${SERVER}${selectedPost.image}`}
                  alt={selectedPost.title}
                />
              ) : (
                <span aria-hidden="true">{selectedPost.cover}</span>
              )}
            </div>

            <span className="category-label">
              {selectedPost.category}
            </span>

            <h1>{selectedPost.title}</h1>

            <p className="article-meta">
              {selectedPost.author} · {selectedPost.date}
            </p>

            <ArticleContent content={selectedPost.content} />

            {selectedPost.tags.length > 0 && (
              <p className="category-label">
                Tags: {selectedPost.tags.join(' · ')}
              </p>
            )}

            <Comments
              key={selectedPost.id}
              postId={selectedPost.id}
            />
          </article>
        ) : (
          <>
            <section className="hero">
              <span className="eyebrow">THE INKSPACE JOURNAL</span>
              <h1>
                Ideas worth reading.
                <br />
                <span>Stories worth sharing.</span>
              </h1>
              <p>
                A space for fresh perspectives on development,
                design, and everyday life.
              </p>
              <a className="primary-button" href="#articles">
                Explore articles ↗
              </a>
              <div className="hero-decoration" aria-hidden="true">
                ✳
              </div>
            </section>

            <section className="articles-section" id="articles">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    EXPLORE THE JOURNAL
                  </span>
                  <h2>The latest stories</h2>
                </div>

                <label className="search-box">
                  <span className="sr-only">Search articles</span>
                  <input
                    type="search"
                    placeholder="Search articles..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              <div
                className="categories"
                aria-label="Filter by category"
              >
                {categories.map((item) => (
                  <button
                    key={item}
                    className={category === item ? 'active' : ''}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {availableTags.length > 0 && (
                <label className="tag-filter" htmlFor="tag-filter">
                  Filter by tag
                  <select
                    id="tag-filter"
                    value={selectedTag}
                    onChange={(event) =>
                      setSelectedTag(event.target.value)
                    }
                  >
                    <option value="">All tags</option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {postsLoading && (
                <p role="status">Loading articles...</p>
              )}

              {postsError && (
                <p className="login-error" role="alert">
                  {postsError}
                </p>
              )}

              {articleError && (
                <p className="login-error" role="alert">
                  {articleError}
                </p>
              )}

              <div className="post-grid">
                {filteredPosts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className={`post-cover ${post.color}`}>
                      {post.image ? (
                        <img
                          className="post-cover-image"
                          src={`${SERVER}${post.image}`}
                          alt={post.title}
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <span aria-hidden="true">{post.cover}</span>
                          <span className="cover-caption">
                            THE INKSPACE EDIT
                          </span>
                        </>
                      )}
                    </div>

                    <div className="post-body">
                      <div className="post-topline">
                        <span className="category-label">
                          {post.category}
                        </span>
                        <span>{post.date}</span>
                      </div>

                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>

                      {post.tags.length > 0 && (
                        <p className="category-label">
                          {post.tags.join(' · ')}
                        </p>
                      )}

                      <div className="post-footer">
                        <span>{post.author}</span>
                        <button
                          onClick={() => openPost(post)}
                          disabled={articleLoading}
                        >
                          {articleLoading
                            ? 'Opening...'
                            : 'Read article ↗'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!postsLoading &&
                !postsError &&
                filteredPosts.length === 0 && (
                  <p className="empty-state">
                    No articles found. Try another search,
                    category, or tag.
                  </p>
                )}
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <span className="footer-brand">inkspace.</span>
        <p>Thoughts, stories, and a little inspiration.</p>
        <span>© 2026 Inkspace</span>
      </footer>
    </div>
  )
}

export default App