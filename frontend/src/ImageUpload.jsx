import { useState } from 'react'

function ImageUpload({ token, image, onChange, onBusyChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')

    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB')
      return
    }

    setUploading(true)
    onBusyChange(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(
        'http://localhost:5000/api/uploads',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Image upload failed')
      }

      onChange(data.image)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to backend.'
          : err.message
      )
    } finally {
      setUploading(false)
      onBusyChange(false)
    }
  }

  return (
    <div className="image-upload">
      <label htmlFor="cover-image">Cover image</label>

      <input
        id="cover-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />

      <small>JPG, PNG or WebP. Maximum 5 MB.</small>

      {uploading && <p role="status">Uploading image...</p>}

      {error && (
        <p className="login-error" role="alert">{error}</p>
      )}

      {image && (
        <div>
          <img
            className="cover-preview"
            src={`http://localhost:5000${image}`}
            alt="Selected article cover"
          />

          <button
            type="button"
            className="back-button"
            onClick={() => onChange('')}
            disabled={uploading}
          >
            Remove cover
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageUpload