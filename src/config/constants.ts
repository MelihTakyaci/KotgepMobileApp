const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''

export const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/kotgepfiles`
export const IMAGE_STORAGE_URL = `${STORAGE_BASE}/DergiKapak/`
export const PDF_STORAGE_URL = `${STORAGE_BASE}/Dergi/`
export const WEATHER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/weather`
