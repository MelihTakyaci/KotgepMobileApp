// src/services/fetchEvents.ts
import { supabase } from './supabase'

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error.message)
    return []
  }

  return data
}