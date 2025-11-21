// src/services/fetchEventImages.ts
import { supabase } from './supabase'

export async function fetchEventImages(eventId: number) {
  const { data, error } = await supabase
    .from('event_images') // Tablo adı
    .select('*')
    .eq('event_id', eventId)
    .order('img_order', { ascending: true })

  if (error) {
    console.error('[Supabase error]', error.message)
    return []
  }

  return data
}