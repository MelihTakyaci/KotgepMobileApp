// src/services/fetchAnnouncements.ts
import { supabase } from './supabase'

export type AnnouncementRow = {
  id: number
  title: string
  announcement_type?: string
  image_url?: string
  content?: string
  is_published?: boolean
  created_at?: string
}

/**
 * Fetch recent published announcements from Supabase.
 * Returns an array (possibly empty) of AnnouncementRow.
 *
 * @param limit number of rows to return (default 8)
 */
export async function fetchAnnouncements(limit = 8): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, announcement_type, image_url, content, is_published, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return []
  }

  return (data as AnnouncementRow[]) ?? []
}

export default fetchAnnouncements
