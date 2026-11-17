import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../../context/EventContext'

const initialForm = { title: '', description: '', date: '', time: '', location: '', capacity: 30 }

export default function EventFormPage() {
  const { createEvent } = useEvents()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createEvent({ ...form, capacity: Number(form.capacity) })
      navigate('/ngo/events')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return <section><h1>Create Event</h1><p>Set the event details and registration capacity.</p><form className="form-grid" onSubmit={submit}>
    {error && <p className="form-error" role="alert">{error}</p>}
    <label>Event title<input value={form.title} maxLength="150" onChange={(event) => update('title', event.target.value)} required /></label>
    <label>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} required /></label>
    <label>Date<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required /></label>
    <label>Time<input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} required /></label>
    <label>Location<input value={form.location} maxLength="200" onChange={(event) => update('location', event.target.value)} required /></label>
    <label>Capacity<input type="number" min="1" step="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} required /></label>
    <button disabled={saving} type="submit">{saving ? 'Creating…' : 'Create event'}</button>
  </form></section>
}
