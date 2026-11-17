import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import './LoginPage.css'

const dashboardRoutes = { volunteer: '/volunteer/dashboard', ngo_admin: '/ngo/dashboard' }

export default function SignUpPage() {
  const { user, isLoading, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  if (isLoading) return <p className="route-loading" role="status">Checking your session…</p>
  if (user) return <Navigate to={dashboardRoutes[user.role] ?? '/'} replace />

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.password.length < 8 || form.password.length > 72) {
      setError('Use a password between 8 and 72 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/login', { replace: true, state: { message: 'Account created. Please sign in.' } })
    } catch (registerError) {
      setError(registerError.message)
    }
  }

  return <section className="login-page"><form className="login-card" onSubmit={handleSubmit}>
    <div className="login-heading"><p className="eyebrow">NGO CONNECT</p><h1>Create your account</h1><p>Join the volunteer community and take part in local events.</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <label htmlFor="name">Full name</label><input id="name" name="name" value={form.name} onChange={updateField} autoComplete="name" maxLength="100" required />
    <label htmlFor="signup-email">Email address</label><input id="signup-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
    <label htmlFor="signup-password">Password</label><input id="signup-password" name="password" type="password" value={form.password} onChange={updateField} minLength="8" maxLength="72" autoComplete="new-password" required />
    <label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required />
    <p className="role-note">NGO Admin accounts are created securely by the project administrator.</p>
    <button type="submit">Create volunteer account</button>
    <p className="signup-link">Already have an account? <Link to="/login">Login</Link></p>
  </form></section>
}
