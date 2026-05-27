import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

type CounterContextType = {
  value: number
  loading: boolean
  increment: () => Promise<void>
  decrement: () => Promise<void>
  reset: () => Promise<void>
  setCounter: (newValue: number) => Promise<void>
}

const CounterContext = createContext<CounterContextType>({} as CounterContextType)

export const CounterProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const [value, setValue] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // DBから最新値を再取得するヘルパー
  const refetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('counters')
      .select('value')
      .eq('user_id', user.id)
      .eq('name', 'default')
      .single()
    if (data) setValue(data.value)
  }, [user])

  useEffect(() => {
    if (!user) return

    // 初期値を取得
    const fetchCounter = async () => {
      const { data } = await supabase
        .from('counters')
        .select('value')
        .eq('user_id', user.id)
        .eq('name', 'default')
        .single()

      if (data) {
        setValue(data.value)
      } else {
        await supabase.from('counters').insert({
          user_id: user.id,
          name: 'default',
          value: 0,
        })
      }
      setLoading(false)
    }

    fetchCounter()

    // Realtimeでリアルタイム同期（アプリ全体で1つのサブスクリプション）
    // 先にsetAuthを同期的に呼んでからチャンネルを作成
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    const channel = supabase
      .channel(`counter-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'counters',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] update received:', payload.new)
          setValue((payload.new as { value: number }).value)
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] subscription status:', status)
        if (err) console.error('[Realtime] error detail:', JSON.stringify(err))
      })

    // トークンが更新されたらRealtimeにも反映
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token)
        }
      }
    )

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      authSub.unsubscribe()
    }
  }, [user])

  const increment = useCallback(async () => {
    if (!user) return
    setValue((prev) => prev + 1)
    const { error } = await supabase.rpc('increment_counter', { uid: user.id })
    if (error) {
      console.error('[Counter] increment error:', error)
      refetch()
    }
  }, [user, refetch])

  const decrement = useCallback(async () => {
    if (!user) return
    setValue((prev) => Math.max(prev - 1, 0))
    const { error } = await supabase.rpc('decrement_counter', { uid: user.id })
    if (error) {
      console.error('[Counter] decrement error:', error)
      refetch()
    }
  }, [user, refetch])

  const reset = useCallback(async () => {
    if (!user) return
    setValue(0)
    const { error } = await supabase.rpc('reset_counter', { uid: user.id })
    if (error) {
      console.error('[Counter] reset error:', error)
      refetch()
    }
  }, [user, refetch])

  const setCounter = useCallback(async (newValue: number) => {
    if (!user) return
    const safeValue = Math.max(newValue, 0)
    setValue(safeValue)
    const { error } = await supabase.rpc('set_counter', { uid: user.id, new_value: safeValue })
    if (error) {
      console.error('[Counter] setCounter error:', error)
      refetch()
    }
  }, [user, refetch])

  return (
    <CounterContext.Provider value={{ value, loading, increment, decrement, reset, setCounter }}>
      {children}
    </CounterContext.Provider>
  )
}

export const useCounter = () => useContext(CounterContext)
