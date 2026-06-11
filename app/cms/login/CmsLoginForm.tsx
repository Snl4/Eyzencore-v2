'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export function CmsLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/cms/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setError(result.error || 'Не вдалося увійти')
      setLoading(false)
      return
    }

    router.replace('/cms')
    router.refresh()
  }

  return (
    <form className="cms-login-form" onSubmit={submit}>
      <label>
        <span>Email адміністратора</span>
        <input
          autoComplete="username"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        <span>Пароль</span>
        <input
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <div className="cms-form-error">{error}</div> : null}
      <button className="cms-primary-button" disabled={loading} type="submit">
        {loading ? 'Перевіряємо...' : 'Увійти в CMS'}
      </button>
    </form>
  )
}
