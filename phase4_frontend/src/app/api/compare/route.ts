import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_MODEL = 'gemini-3.5-flash'

async function callGemini(apiKey: string, prompt: string): Promise<Response> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  }
  const res = await fetch(url, init)
  // Gemini sheds load with 503 during demand spikes; one short retry usually clears it.
  if (res.status === 503) {
    await new Promise(r => setTimeout(r, 1200))
    return fetch(url, init)
  }
  return res
}

interface ProductInput {
  name: string
  price?: number | null
  discount_percent?: number | null
  analysis?: { quality_score?: number; recommendation?: string; pros?: string[]; cons?: string[] }
}

function describe(label: string, p: ProductInput): string {
  const a = p.analysis
  return [
    `${label}: ${p.name}`,
    `Price: ${p.price ? `Rs ${p.price.toLocaleString('en-IN')}` : 'N/A'}`,
    p.discount_percent ? `Discount: ${p.discount_percent}% off` : '',
    a?.quality_score ? `AI score: ${a.quality_score}/100 (${a.recommendation ?? 'N/A'})` : '',
    a?.pros?.length ? `Pros: ${a.pros.slice(0, 3).join(', ')}` : '',
    a?.cons?.length ? `Cons: ${a.cons.slice(0, 1).join(', ')}` : '',
  ].filter(Boolean).join('\n')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ verdict: null, error: 'AI comparison not configured' }, { status: 503 })
  }

  let productA: ProductInput, productB: ProductInput
  try {
    ({ productA, productB } = await req.json())
    if (!productA?.name || !productB?.name) throw new Error('missing products')
  } catch {
    return NextResponse.json({ verdict: null, error: 'Invalid request' }, { status: 400 })
  }

  const prompt = `Compare these two products for an Indian shopper and give a concise verdict.

${describe('Product A', productA)}

${describe('Product B', productB)}

Write a 3-sentence verdict:
1. Which is better value for money and why
2. Who should pick Product A vs Product B (specific use cases)
3. Final recommendation with one clear winner

Be direct and specific. No filler phrases, no markdown, no emoji.`

  try {
    const res = await callGemini(apiKey, prompt)
    if (!res.ok) {
      return NextResponse.json({ verdict: null, error: `Gemini returned ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    const verdict: string | null = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
    return NextResponse.json({ verdict })
  } catch {
    return NextResponse.json({ verdict: null, error: 'AI request failed' }, { status: 500 })
  }
}
