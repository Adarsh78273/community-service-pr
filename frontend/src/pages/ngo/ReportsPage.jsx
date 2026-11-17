import { useEvents } from '../../context/EventContext'

export default function ReportsPage() {
  const { events, registrations, isLoading, error } = useEvents()
  if (isLoading) return <p role="status">Loading reports…</p>
  return <section><h1>Event Progress Reports</h1><p>Review registrations and attendance across your events.</p>{error && <p className="form-error" role="alert">{error}</p>}{events.map((event) => {
    const records = registrations.filter((item) => item.eventId === event.id)
    const present = records.filter((item) => item.attended).length
    const percentage = records.length ? Math.round(present / records.length * 100) : 0
    return <article className="event-card" key={event.id}><h2>{event.title} <span className={`status status-${event.status}`}>{event.status}</span></h2><p>{event.date} · {event.location}</p><p>Attendance: {present}/{records.length} ({percentage}%)</p><p>{event.status === 'closed' ? 'Event completed.' : event.status === 'live' ? 'Event is live.' : 'Event is in draft.'}</p></article>
  })}{events.length === 0 && <p>No event reports yet.</p>}</section>
}
