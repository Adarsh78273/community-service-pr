import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useAuth } from '../../context/AuthContext'
import { useEvents } from '../../context/EventContext'

export default function QrScanPage() {
  const { user } = useAuth(); const { markAttendance } = useEvents(); const [message, setMessage] = useState('Point your camera at the event attendance QR.'); const started = useRef(false)
  useEffect(() => {
    if (started.current) return undefined; started.current = true
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false)
    scanner.render((decodedText) => { try { const data = JSON.parse(decodedText); if (data.type !== 'ngo-attendance' || !data.eventId || !data.qrToken) throw new Error('This is not a valid event attendance QR.'); setMessage('Checking attendance…'); markAttendance(data.eventId, data.qrToken).then(() => { setMessage('Attendance marked successfully.'); scanner.clear() }).catch((error) => setMessage(error.message)) } catch (error) { setMessage(error.message) } }, () => {})
    return () => { scanner.clear().catch(() => {}) }
  }, [markAttendance, user.id])
  return <section><h1>Scan Event QR</h1><p className="notice">{message}</p><div id="qr-reader" /></section>
}
