import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { attendanceApi } from '../../services/api'
import { useEvents } from '../../context/EventContext'

export default function EventManagementDetailsPage() {
  const { eventId } = useParams()
  const { events, registrations, isLoading, updateEvent, setEventStatus, generateQr } = useEvents()
  const event = events.find((item) => item.id === eventId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!event) return
    let active = true
    attendanceApi.list(event.id).then((data) => { if (active) setRecords(data) })
      .catch((loadError) => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [event, registrations.length])

  if (isLoading) return <p role="status">Loading event…</p>
  if (!event) return <p>Event not found.</p>

  const eventRecords = records.length ? records : registrations.filter((item) => item.eventId === event.id)
  const qrValue = JSON.stringify({ type: 'ngo-attendance', eventId: event.id, qrToken: event.qrToken })

  async function perform(action) {
    setError('')
    try { await action() } catch (actionError) { setError(actionError.message) }
  }

  async function save() {
    await perform(async () => {
      await updateEvent(event.id, { ...draft, capacity: Number(draft.capacity) })
      setEditing(false)
    })
  }

  function beginEditing() {
    setDraft({ title: event.title, description: event.description, date: event.date, time: event.time, location: event.location, capacity: event.capacity })
    setEditing(true)
  }

  return <section>
    <div className="page-title"><h1>{event.title}</h1><span className={`status status-${event.status}`}>{event.status}</span></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {editing ? <div className="form-grid">{['title', 'description', 'date', 'time', 'location', 'capacity'].map((key) => <label key={key}>{key}<input type={key === 'date' ? 'date' : key === 'time' ? 'time' : key === 'capacity' ? 'number' : 'text'} value={draft[key]} onChange={(input) => setDraft({ ...draft, [key]: input.target.value })} /></label>)}<button onClick={save}>Save changes</button><button onClick={() => setEditing(false)}>Cancel</button></div> : <><p>{event.description}</p><p>{event.date} · {event.time}</p><p>{event.location} · Capacity: {event.capacity}</p><button onClick={beginEditing}>Edit event</button></>}
    <div className="inline-form"><button onClick={() => perform(() => setEventStatus(event.id, 'live'))}>Set live</button><button onClick={() => perform(() => setEventStatus(event.id, 'closed'))}>Close event</button><button onClick={() => perform(() => generateQr(event.id))}>{event.qrToken ? 'Regenerate QR' : 'Generate QR'}</button></div>
    {event.qrToken && <div className="qr-box"><h2>Attendance QR</h2><QRCodeSVG value={qrValue} size={220} includeMargin /><p>Last generated: {event.qrUpdatedAt ? new Date(event.qrUpdatedAt).toLocaleString() : 'Recently'}</p><p>Regenerating invalidates the previous QR.</p></div>}
    <h2>Registration and Attendance</h2><p>{eventRecords.length} registered · {eventRecords.filter((item) => item.attended).length} attended · {eventRecords.filter((item) => !item.attended).length} pending</p>
    <div className="table-wrap"><table><thead><tr><th>Volunteer</th><th>Email</th><th>Attendance</th><th>Check-in time</th></tr></thead><tbody>{eventRecords.map((item) => <tr key={item.id}><td>{item.volunteerName}</td><td>{item.volunteerEmail}</td><td>{item.attended ? 'Present' : 'Pending'}</td><td>{item.checkedInAt ? new Date(item.checkedInAt).toLocaleString() : '—'}</td></tr>)}</tbody></table></div>
  </section>
}
