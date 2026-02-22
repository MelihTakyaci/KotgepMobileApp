// src/services/fetchEvents.ts
import { supabase } from './supabase'

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, cover_image')
    .order('id', { ascending: false })

  if (error) {
    return []
  }

  return data
}
