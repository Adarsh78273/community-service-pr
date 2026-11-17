const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  if (!API_BASE_URL) throw new Error('Backend API is not configured. Set VITE_API_URL when the backend is ready.')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message ?? 'Request failed. Please try again.')
  return body
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (account) => request('/auth/register', { method: 'POST', body: JSON.stringify(account) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
}

export const eventApi = {
  list: () => request('/events'),
  create: (event) => request('/events', { method: 'POST', body: JSON.stringify(event) }),
  update: (eventId, event) => request(`/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(event) }),
  generateQr: (eventId) => request(`/events/${eventId}/qr`, { method: 'POST' }),
  register: (eventId) => request(`/events/${eventId}/registrations`, { method: 'POST' }),
}

export const attendanceApi = {
  listMine: () => request('/registrations'),
  list: (eventId) => request(`/events/${eventId}/registrations`),
  checkIn: (eventId, qrToken) => request(`/events/${eventId}/attendance`, { method: 'POST', body: JSON.stringify({ qrToken }) }),
}
