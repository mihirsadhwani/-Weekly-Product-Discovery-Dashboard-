import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ verdict: null, error: 'AI comparison not configured' }, { status: 503 })
  }

  const { productA, productB } = await req.json()

  const prompt = `Compare these two products for an Indian shopper and give a concise verdict.

Product A: ${productA.name}
Price: ₹${productA.price?.toLocaleString('en-IN') ?? 'N/A'}
${productA.discount_percent ? `Discount: ${productA.discount_percent}% off` : ''}
AI Score: ${productA.analysis?.quality_score ?? 0}/100
Recommendation: ${productA.analysis?.recommendation ?? 'N/A'}
Pros: ${(productA.analysis?.pros ?? []).slice(0, 3).join(', ')}
Cons: ${(productA.analysis?.cons ?? []).slice(0, 1).join(', ')}

Product B: ${productB.name}
Price: ₹${productB.price?.toLocaleString('en-IN') ?? 'N/A'}
${productB.discount_percent ? `Discount: ${productB.discount_percent}% off` : ''}
AI Score: ${productB.analysis?.quality_score ?? 0}/100
Recommendation: ${productB.analysis?.recommendation ?? 'N/A'}
Pros: ${(productB.analysis?.pros ?? []).slice(0, 3).join(', ')}
Cons: ${(productB.analysis?.cons ?? []).slice(0, 1).join(', ')}

Write a 3-sentence verdict:
1. Which is better value for money and why
2. Who should pick Product A vs Product B (specific use cases)
3. Final recommendation with one clear winner

Be direct and specific. No filler phrases.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      }),
    })
    const data = await res.json()
    const verdict = data.choices?.[0]?.message?.content?.trim() ?? null
    return NextResponse.json({ verdict })
  } catch {
    return NextResponse.json({ verdict: null, error: 'AI request failed' }, { status: 500 })
  }
}
