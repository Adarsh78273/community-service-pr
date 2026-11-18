import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    authApi.me()
      .then(({ user: currentUser }) => { if (isMounted) setUser(currentUser) })
      .catch(() => { if (isMounted) setUser(null) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [])

  async function register(account) {
    return authApi.register(account)
  }

  async function login(email, password) {
    const { user: signedInUser } = await authApi.login({ email, password })
    setUser(signedInUser)
    return signedInUser
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, register, login, logout }}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
