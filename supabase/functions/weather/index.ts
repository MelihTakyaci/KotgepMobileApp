import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const API_KEY = "40bca4e22ad85b2c3b613990f2d7b66f";

serve(async (req) => {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city') || 'Berlin'
  if (!API_KEY) {
  return new Response(
    JSON.stringify({ error: "API_KEY env değişkeni eksik veya okunamıyor" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

  const weatherRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=tr`
  )
  const data = await weatherRes.json()

  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})