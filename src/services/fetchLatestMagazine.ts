import { supabase } from './supabase'

export type MagazineRow = {
  id: number
  issue_number?: number
  month?: string
  pdf_path?: string
}

/**
 * Fetch the latest magazine issue (by id desc) and return a single row or null.
 */
export async function fetchLatestMagazine(): Promise<MagazineRow | null> {
  const { data, error } = await supabase
    .from('magazine_issues')
    .select('id, issue_number, month, pdf_path')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return null
  }

  return (data as MagazineRow) ?? null
}
