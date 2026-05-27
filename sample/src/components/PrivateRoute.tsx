import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { CounterProvider } from '../contexts/CounterContext'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <CounterProvider>{children}</CounterProvider> : <Navigate to="/login" replace />
}