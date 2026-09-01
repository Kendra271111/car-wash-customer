import { useEffect, useRef } from 'react'
import { supabase } from '../libs/supabase'

type Options = {
  tables: string[]
  onChange: (table: string, payload: unknown) => void
  filter?: string
}

export function useRealtimeRefresh({ tables, onChange, filter }: Options) {
  const onChangeRef = useRef(onChange)
  const tablesKey = tables.join(',')

  // Keep callback fresh without putting it in the subscribe effect deps
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const channelName = `db-${tablesKey}-${filter ?? 'all'}-${Math.random().toString(36).slice(2)}`
    const channel = supabase.channel(channelName)

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          console.log('[realtime]', table, payload.eventType)
          onChangeRef.current(table, payload)
        }
      )
    }

    channel.subscribe((status, err) => {
      console.log('[realtime] status:', status, err)
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tablesKey, filter]) // eslint-disable-line react-hooks/exhaustive-deps -- tables from tablesKey
}