import { useEffect, useRef } from 'react'
import { supabase } from '../libs/supabase'

type Options = {
  tables: string[]
  onChange: (table: string, payload: unknown) => void
  filter?: string
}

export function useRealtimeRefresh({ tables, onChange}: Options) {
  const onChangeRef = useRef(onChange)
  const tablesKey = tables.join(',')

  // Keep callback fresh without putting it in the subscribe effect deps
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
  const channel = supabase.channel(`dashboard-${tablesKey}`)

  for (const table of tables) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        console.log('[realtime]', table, payload.eventType, payload)
        onChangeRef.current(table, payload)
      }
    )
  }

  channel.subscribe((status, err) => {
    console.log('[realtime] status:', status, err)
  })

  return () => {
    void supabase.removeChannel(channel)
  }
}, [tablesKey]) // avoid filter unless you really need it
}