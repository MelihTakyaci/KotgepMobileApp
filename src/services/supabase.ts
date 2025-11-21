// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

// NOT: Aşağıdaki bilgileri kendi Supabase projenle değiştir!
const SUPABASE_URL = 'https://jjygunxzboqsruwyenay.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqeWd1bnh6Ym9xc3J1d3llbmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTQ3OTUsImV4cCI6MjA2OTg3MDc5NX0.zqnYkkavEUbeTu9SgJE5-v9egzzRpumVfFX0_kqLxHk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)