import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { attendanceApi, eventApi } from '../services/api'

const EventContext = createContext(null)

export function EventProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth()
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loadedUserId, setLoadedUserId] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) return
    setError('')
    const [nextEvents, nextRegistrations] = await Promise.all([
      eventApi.list(),
      attendanceApi.listMine(),
    ])
    setEvents(nextEvents)
    setRegistrations(nextRegistrations)
  }, [user])

  useEffect(() => {
    let isMounted = true
    if (authLoading) return () => { isMounted = false }
    if (!user) return () => { isMounted = false }

    Promise.all([eventApi.list(), attendanceApi.listMine()])
      .then(([nextEvents, nextRegistrations]) => {
        if (!isMounted) return
        setEvents(nextEvents)
        setRegistrations(nextRegistrations)
        setError('')
      })
      .catch((loadError) => { if (isMounted) setError(loadError.message) })
      .finally(() => { if (isMounted) setLoadedUserId(user.id) })
    return () => { isMounted = false }
  }, [authLoading, refresh, user])

  async function createEvent(details) {
    const createdEvent = await eventApi.create(details)
    setEvents((current) => [...current, createdEvent])
    return createdEvent
  }

  async function updateEvent(id, details) {
    const updatedEvent = await eventApi.update(id, details)
    setEvents((current) => current.map((event) => event.id === id ? updatedEvent : event))
    return updatedEvent
  }

  async function setEventStatus(id, status) {
    return updateEvent(id, { status })
  }

  async function generateQr(id) {
    const qr = await eventApi.generateQr(id)
    setEvents((current) => current.map((event) => event.id === id ? { ...event, ...qr } : event))
    return qr.qrToken
  }

  async function registerForEvent(eventId) {
    const registration = await eventApi.register(eventId)
    setRegistrations((current) => [...current, registration])
    return registration
  }

  async function markAttendance(eventId, qrToken) {
    const updatedRegistration = await attendanceApi.checkIn(eventId, qrToken)
    setRegistrations((current) => current.map((item) => item.id === updatedRegistration.id ? updatedRegistration : item))
    return updatedRegistration
  }

  function eventRegistrations(eventId) {
    return registrations.filter((item) => item.eventId === eventId)
  }

  return <EventContext.Provider value={{ events: user ? events : [], registrations: user ? registrations : [], isLoading: authLoading || (Boolean(user) && loadedUserId !== user.id), error: user ? error : '', refresh, createEvent, updateEvent, setEventStatus, generateQr, registerForEvent, markAttendance, eventRegistrations }}>{children}</EventContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useEvents() {
  const context = useContext(EventContext)
  if (!context) throw new Error('useEvents must be used inside EventProvider.')
  return context
}
