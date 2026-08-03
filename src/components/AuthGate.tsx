import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

interface Props {
  children: (session: Session) => React.ReactNode
}

export default function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSendLink = async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.href },
    })
    setSending(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (loading) {
    return <div className="center-message">Loading…</div>
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>To-Do Tracker</h1>
          {sent ? (
            <p>
              Check <strong>{email}</strong> for a sign-in link. You can close
              this tab.
            </p>
          ) : (
            <>
              <p>Sign in with a magic link — no password needed.</p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendLink()}
              />
              <button onClick={handleSendLink} disabled={sending}>
                {sending ? 'Sending…' : 'Send magic link'}
              </button>
              {error && <p className="auth-error">{error}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  return <>{children(session)}</>
}
