import { NextRequest, NextResponse } from 'next/server'
import { openai, GPT_MODEL } from '@/lib/openai'
import type { CareerAnalysis } from '@/types/career'
import type { ParsedResume } from '@/types/resume'

const SYSTEM_PROMPT = `You are a career advisor specializing in Software Development Engineer (SDE) roles for new graduates (0-2 years experience).

Analyze the provided resume and return a JSON object with this exact structure:
{
  "recommendedTracks": [
    {
      "track": "<one of: Frontend, Backend, Full-Stack, MLE, Data Engineer, DevOps, Mobile, Embedded, Security, Platform>",
      "fitScore": <number 0-100>,
      "reasoning": "<2-3 sentence explanation>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "skillGaps": [
    {
      "track": "<track name>",
      "missingSkills": ["<skill 1>", "<skill 2>", ...]
    }
  ],
  "actionItems": ["<action 1>", "<action 2>", ...],
  "overallAssessment": "<2-4 sentence overall assessment>"
}

Rules:
- Only recommend SDE tracks: Frontend, Backend, Full-Stack, MLE, Data Engineer, DevOps, Mobile, Embedded, Security, Platform
- Context: new graduate with 0-2 years of experience
- Return 3-5 recommended tracks sorted by fitScore descending
- Provide skill gaps only for the top 3 tracks
- Provide 3-5 actionable, specific action items
- Provide 3-6 strengths
- Be honest and actionable in your advice
- Return ONLY valid JSON, no markdown or extra text`

function buildUserMessage(resumeData: ParsedResume): string {
  const parts: string[] = []

  parts.push('=== RESUME CONTENT ===')
  parts.push(resumeData.rawText)

  if (resumeData.skills?.length) {
    parts.push('\n=== EXTRACTED SKILLS ===')
    parts.push(resumeData.skills.map(s => s.name).join(', '))
  }

  if (resumeData.education?.length) {
    parts.push('\n=== EDUCATION ===')
    for (const edu of resumeData.education) {
      parts.push(`${edu.degree} in ${edu.field} from ${edu.institution}`)
    }
  }

  if (resumeData.experiences?.length) {
    parts.push('\n=== EXPERIENCE ===')
    for (const exp of resumeData.experiences) {
      parts.push(`${exp.title} at ${exp.company}`)
    }
  }

  if (resumeData.projects?.length) {
    parts.push('\n=== PROJECTS ===')
    for (const proj of resumeData.projects) {
      parts.push(`${proj.name}: ${proj.description.join('; ')}`)
      if (proj.technologies?.length) {
        parts.push(`  Technologies: ${proj.technologies.join(', ')}`)
      }
    }
  }

  return parts.join('\n')
}

function validateAnalysis(data: unknown): data is Omit<CareerAnalysis, 'analyzedAt' | 'resumeId'> {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.recommendedTracks) || obj.recommendedTracks.length === 0) return false
  if (!Array.isArray(obj.strengths) || obj.strengths.length === 0) return false
  if (!Array.isArray(obj.skillGaps)) return false
  if (!Array.isArray(obj.actionItems) || obj.actionItems.length === 0) return false
  if (typeof obj.overallAssessment !== 'string') return false

  for (const track of obj.recommendedTracks) {
    if (typeof track.track !== 'string') return false
    if (typeof track.fitScore !== 'number') return false
    if (typeof track.reasoning !== 'string') return false
  }

  for (const gap of obj.skillGaps) {
    if (typeof gap.track !== 'string') return false
    if (!Array.isArray(gap.missingSkills)) return false
  }

  return true
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'Request body too large (max 5MB)' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const resumeData = body.resumeData as ParsedResume | undefined

    if (!resumeData?.rawText) {
      return NextResponse.json(
        { ok: false, error: 'Missing resume data or rawText' },
        { status: 400 }
      )
    }

    const userMessage = buildUserMessage(resumeData)

    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { ok: false, error: 'Empty response from AI' },
        { status: 500 }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
    }

    if (!validateAnalysis(parsed)) {
      return NextResponse.json(
        { ok: false, error: 'AI response does not match expected schema' },
        { status: 500 }
      )
    }

    const analysis: CareerAnalysis = {
      ...(parsed as Omit<CareerAnalysis, 'analyzedAt' | 'resumeId'>),
      analyzedAt: new Date().toISOString(),
      resumeId: resumeData.id,
    }

    return NextResponse.json({ ok: true, data: analysis })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      (error as { status: number }).status === 429
    ) {
      return NextResponse.json(
        { ok: false, error: 'Rate limited by OpenAI. Please try again in a moment.' },
        { status: 429 }
      )
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
