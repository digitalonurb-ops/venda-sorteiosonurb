import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

const CACHE_KEY = 'public-data-cache'
const CACHE_TTL = 1000 * 30

function getLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return undefined
    const { data, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > CACHE_TTL) return undefined
    return data
  } catch {
    return undefined
  }
}

function setLocalCache(data: unknown) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }))
  } catch {}
}

export function usePublicData() {
  return useQuery({
    queryKey: ['public-data'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'public-all' },
      })
      if (data) {
        setLocalCache(data)
        return data
      }
      // função desativada → preserva último cache válido ou objeto vazio
      return getLocalCache() ?? {}
    },
    initialData: getLocalCache,
    initialDataUpdatedAt: () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return 0
        const { savedAt } = JSON.parse(raw)
        return savedAt
      } catch {
        return 0
      }
    },
    staleTime: CACHE_TTL,
    gcTime: 1000 * 60,
    refetchInterval: 1000 * 30,
    refetchOnWindowFocus: false,
    placeholderData: (prev: unknown) => prev,
  })
}
