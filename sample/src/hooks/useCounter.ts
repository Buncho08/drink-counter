import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCounter() {
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
        // レコードがなければ作成
        await supabase.from('counters').insert({
          user_id: user.id,
          name: 'default',
          value: 0,
        })
      }
      setLoading(false)
    }

    fetchCounter()

    // Realtimeでリアルタイム同期（他端末からの変更を受信）
    const channel = supabase
      .channel(`counter-${user.id}`)
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
      .subscribe((status) => {
        console.log('[Realtime] subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const increment = useCallback(async () => {
    if (!user) return
    // 楽観的更新：即座にUIを更新
    setValue((prev) => prev + 1)
    const { error } = await supabase.rpc('increment_counter', { uid: user.id })
    if (error) {
      console.error('[Counter] increment error:', error)
      // エラー時はDBから再取得してロールバック
      refetch()
    }
  }, [user, refetch])

  const decrement = useCallback(async () => {
    if (!user) return
    // 楽観的更新：即座にUIを更新
    setValue((prev) => Math.max(prev - 1, 0))
    const { error } = await supabase.rpc('decrement_counter', { uid: user.id })
    if (error) {
      console.error('[Counter] decrement error:', error)
      // エラー時はDBから再取得してロールバック
      refetch()
    }
  }, [user, refetch])

  return { value, loading, increment, decrement }
}