import { NextRequest, NextResponse } from 'next/server'
import type { CareerAnalysis } from '@/types/career'
import type { ParsedResume } from '@/types/resume'
import type { JSearchJob, JSearchResponse, JobListing, JobRecommendationResult } from '@/types/job'

const TRACK_QUERY_MAP: Record<string, string> = {
  'Frontend': 'frontend software engineer new grad',
  'Backend': 'backend software engineer new grad',
  'Full-Stack': 'full stack software engineer new grad',
  'MLE': 'machine learning engineer entry level',
  'Data Engineer': 'data engineer entry level',
  'DevOps': 'devops engineer entry level',
  'Mobile': 'mobile software engineer new grad',
  'Embedded': 'embedded software engineer entry level',
  'Security': 'security engineer entry level',
  'Platform': 'platform engineer entry level',
}

function formatSalary(min?: number, max?: number, currency?: string): string | undefined {
  if (!min && !max) return undefined
  const cur = currency || 'USD'
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}K`
    return `${n}`
  }
  if (min && max) return `${cur === 'USD' ? '$' : cur + ' '}${fmt(min)}-${fmt(max)}`
  if (min) return `${cur === 'USD' ? '$' : cur + ' '}${fmt(min)}+`
  if (max) return `Up to ${cur === 'USD' ? '$' : cur + ' '}${fmt(max)}`
  return undefined
}

function formatLocation(city?: string, state?: string, country?: string, isRemote?: boolean): string {
  const parts: string[] = []
  if (city) parts.push(city)
  if (state) parts.push(state)
  if (parts.length === 0 && country) parts.push(country)
  const loc = parts.join(', ')
  if (isRemote && loc) return `${loc} (Remote)`
  if (isRemote) return 'Remote'
  return loc || 'Not specified'
}

function convertJob(job: JSearchJob, track: string): JobListing {
  return {
    id: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    companyLogo: job.employer_logo || undefined,
    location: formatLocation(job.job_city, job.job_state, job.job_country, job.job_is_remote),
    isRemote: job.job_is_remote,
    salaryRange: formatSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency),
    applyLink: job.job_apply_link,
    postedDate: job.job_posted_at_datetime_utc,
    employmentType: job.job_employment_type || 'FULLTIME',
    track,
  }
}

async function fetchJSearchJobs(query: string, apiKey: string): Promise<JSearchJob[]> {
  const params = new URLSearchParams({
    query,
    page: '1',
    num_pages: '1',
    date_posted: 'month',
    employment_types: 'FULLTIME,INTERN',
    job_requirements: 'under_3_years_experience,no_experience',
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.status === 429) {
      throw new Error('RATE_LIMITED')
    }

    if (!res.ok) {
      throw new Error(`JSearch API error: ${res.status} ${res.statusText}`)
    }

    const data: JSearchResponse = await res.json()
    if (!data || !Array.isArray(data.data)) return []
    return data.data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('JSearch API request timed out')
    }
    throw err
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'RapidAPI key not configured. Add RAPIDAPI_KEY to .env.local' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const careerAnalysis = body.careerAnalysis as CareerAnalysis | undefined
    const resumeData = body.resumeData as ParsedResume | undefined

    if (!careerAnalysis?.recommendedTracks?.length) {
      return NextResponse.json(
        { ok: false, error: 'Career analysis with recommended tracks is required' },
        { status: 400 }
      )
    }

    // Take top 2 tracks
    const topTracks = careerAnalysis.recommendedTracks.slice(0, 2)

    // Extract optional location from resume
    const location = resumeData?.personalInfo?.location

    const allJobs: JobListing[] = []
    const tracksQueried: string[] = []

    // Fetch sequentially to conserve rate limits
    for (const trackRec of topTracks) {
      const trackName = trackRec.track
      const baseQuery = TRACK_QUERY_MAP[trackName]
      if (!baseQuery) continue

      const query = location ? `${baseQuery} ${location}` : baseQuery
      tracksQueried.push(trackName)

      try {
        const jobs = await fetchJSearchJobs(query, apiKey)
        const converted = jobs.map(j => convertJob(j, trackName))
        allJobs.push(...converted)
      } catch (err) {
        if (err instanceof Error && err.message === 'RATE_LIMITED') {
          return NextResponse.json(
            { ok: false, error: 'JSearch API rate limit reached. Try again later.' },
            { status: 429 }
          )
        }
        // Log but continue for other tracks
        console.error(`Failed to fetch jobs for track "${trackName}":`, err)
      }
    }

    // Deduplicate by job_id
    const seen = new Set<string>()
    const dedupedJobs = allJobs.filter(job => {
      if (seen.has(job.id)) return false
      seen.add(job.id)
      return true
    })

    // Sort by posted date (newest first)
    dedupedJobs.sort((a, b) =>
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )

    // Cap at 10 per track
    const trackCounts: Record<string, number> = {}
    const cappedJobs = dedupedJobs.filter(job => {
      trackCounts[job.track] = (trackCounts[job.track] || 0) + 1
      return trackCounts[job.track] <= 10
    })

    const result: JobRecommendationResult = {
      jobs: cappedJobs,
      fetchedAt: new Date().toISOString(),
      resumeId: resumeData?.id || '',
      tracksQueried,
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
