'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Briefcase,
  ExternalLink,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import type { CareerAnalysis } from '@/types/career'
import type { ParsedResume } from '@/types/resume'
import type { JobListing, JobRecommendationResult } from '@/types/job'

interface JobRecommendationsProps {
  careerAnalysis: CareerAnalysis
  resumeData: ParsedResume
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const TRACK_COLORS: Record<string, string> = {
  'Frontend': 'bg-blue-100 text-blue-800 border-blue-200',
  'Backend': 'bg-green-100 text-green-800 border-green-200',
  'Full-Stack': 'bg-purple-100 text-purple-800 border-purple-200',
  'MLE': 'bg-orange-100 text-orange-800 border-orange-200',
  'Data Engineer': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'DevOps': 'bg-red-100 text-red-800 border-red-200',
  'Mobile': 'bg-pink-100 text-pink-800 border-pink-200',
  'Embedded': 'bg-amber-100 text-amber-800 border-amber-200',
  'Security': 'bg-slate-100 text-slate-800 border-slate-200',
  'Platform': 'bg-indigo-100 text-indigo-800 border-indigo-200',
}

function formatRelativeDate(dateStr: string): string {
  const posted = new Date(dateStr)
  if (isNaN(posted.getTime())) return 'Recently'

  const diffMs = Date.now() - posted.getTime()
  if (diffMs < 0) return 'Recently'
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function formatEmploymentType(type: string): string {
  const map: Record<string, string> = {
    FULLTIME: 'Full-time',
    PARTTIME: 'Part-time',
    INTERN: 'Internship',
    CONTRACTOR: 'Contract',
  }
  return map[type] || type
}

function JobCard({ job }: { job: JobListing }) {
  const trackColor = TRACK_COLORS[job.track] || 'bg-gray-100 text-gray-800 border-gray-200'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={`${job.company} logo`}
                className="w-10 h-10 rounded-md object-contain shrink-0 bg-gray-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-medium text-sm leading-tight truncate">{job.title}</h4>
              <p className="text-sm text-gray-600 truncate">{job.company}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className={trackColor}>
                  {job.track}
                </Badge>
                {job.isRemote && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Remote
                  </Badge>
                )}
                <Badge variant="outline">
                  {formatEmploymentType(job.employmentType)}
                </Badge>
              </div>
            </div>
          </div>
          <a
            href={job.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button variant="outline" size="sm">
              Apply
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          {job.salaryRange && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salaryRange}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatRelativeDate(job.postedDate)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function JobRecommendations({ careerAnalysis, resumeData }: JobRecommendationsProps) {
  const [result, setResult] = useState<JobRecommendationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = `job-recommendations-${resumeData.id}`

  // Load cached results on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed: JobRecommendationResult = JSON.parse(cached)
        if (!parsed.jobs || !Array.isArray(parsed.jobs) || !parsed.fetchedAt) {
          localStorage.removeItem(cacheKey)
          return
        }
        const fetchedTime = new Date(parsed.fetchedAt).getTime()
        if (isNaN(fetchedTime)) {
          localStorage.removeItem(cacheKey)
          return
        }
        const age = Date.now() - fetchedTime
        if (age < CACHE_TTL_MS) {
          setResult(parsed)
        } else {
          localStorage.removeItem(cacheKey)
        }
      }
    } catch {
      try { localStorage.removeItem(cacheKey) } catch { /* localStorage may be disabled */ }
    }
  }, [cacheKey])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/job-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careerAnalysis, resumeData }),
      })

      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch job recommendations')
      }

      setResult(data.data)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data.data))
      } catch {
        // localStorage may be full or disabled
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch jobs'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [careerAnalysis, resumeData, cacheKey])

  // Idle state
  if (!result && !loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Job Recommendations
              </CardTitle>
              <CardDescription className="mt-1">
                Find matching entry-level jobs based on your career tracks
              </CardDescription>
            </div>
            <Button onClick={fetchJobs} disabled={loading}>
              <Briefcase className="h-4 w-4 mr-2" />
              Find Matching Jobs
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Job Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-600 font-medium">Finding matching jobs...</p>
            <p className="text-sm text-gray-400">Searching based on your top career tracks</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Results state
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Job Recommendations
            </CardTitle>
            <CardDescription className="mt-1">
              Found {result!.jobs.length} job{result!.jobs.length !== 1 ? 's' : ''} for{' '}
              {result!.tracksQueried.join(', ')}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        {result!.jobs.length === 0 ? (
          <p className="text-center text-gray-500 py-6">
            No matching jobs found. Try refreshing later.
          </p>
        ) : (
          <div className="space-y-3">
            {result!.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 text-right mt-4">
          Last updated: {new Date(result!.fetchedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
