'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Target,
  TrendingUp,
  Zap,
  ListChecks,
} from 'lucide-react'
import type { CareerAnalysis as CareerAnalysisType } from '@/types/career'
import type { ParsedResume } from '@/types/resume'
import { JobRecommendations } from './JobRecommendations'

interface CareerAnalysisProps {
  data: ParsedResume | null
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-gray-400'
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-700'
  if (score >= 60) return 'text-blue-700'
  if (score >= 40) return 'text-yellow-700'
  return 'text-gray-600'
}

export function CareerAnalysis({ data }: CareerAnalysisProps) {
  const [analysis, setAnalysis] = useState<CareerAnalysisType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = data ? `career-analysis-${data.id}` : null

  // Load cached analysis on mount
  useEffect(() => {
    if (!cacheKey) return
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setAnalysis(JSON.parse(cached))
      }
    } catch {
      // Ignore invalid cache
    }
  }, [cacheKey])

  const handleAnalyze = useCallback(async () => {
    if (!data) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: data }),
      })

      const result = await res.json()

      if (!result.ok) {
        throw new Error(result.error || 'Analysis failed')
      }

      setAnalysis(result.data)

      // Cache result
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(result.data))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [data, cacheKey])

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Structured resume data is required for AI analysis.</p>
        <p className="text-sm mt-1">Please ensure your resume has been parsed first.</p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-gray-600 font-medium">Analyzing your resume...</p>
        <p className="text-sm text-gray-400">This may take 10-20 seconds</p>
      </div>
    )
  }

  // Idle state (no analysis yet)
  if (!analysis) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="text-center py-12 space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">AI Career Analysis</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Get personalized SDE career track recommendations based on your resume.
              Our AI will analyze your skills, experience, and education to suggest
              the best software engineering paths for you.
            </p>
          </div>
          <Button onClick={handleAnalyze} size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze My Resume
          </Button>
        </div>
      </div>
    )
  }

  // Results state
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with re-analyze */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Career Analysis Results</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleAnalyze}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-analyze
        </Button>
      </div>

      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Overall Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{analysis.overallAssessment}</p>
        </CardContent>
      </Card>

      {/* Recommended Tracks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Recommended SDE Tracks
          </CardTitle>
          <CardDescription>Sorted by fit score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.recommendedTracks.map((track, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{track.track}</span>
                  <span className={`text-sm font-semibold ${getScoreTextColor(track.fitScore)}`}>
                    {track.fitScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getScoreColor(track.fitScore)}`}
                    style={{ width: `${track.fitScore}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">{track.reasoning}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Skill Gaps */}
      {analysis.skillGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-yellow-600" />
              Skill Gaps
            </CardTitle>
            <CardDescription>Skills to develop for your top tracks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.skillGaps.map((gap, i) => (
                <div key={i}>
                  <p className="font-medium text-sm mb-2">{gap.track}</p>
                  <div className="flex flex-wrap gap-2">
                    {gap.missingSkills.map((skill, j) => (
                      <Badge key={j} variant="secondary" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 list-decimal list-inside">
            {analysis.actionItems.map((item, i) => (
              <li key={i} className="text-gray-700">{item}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Timestamp */}
      <p className="text-xs text-gray-400 text-right">
        Analyzed at {new Date(analysis.analyzedAt).toLocaleString()}
      </p>

      {/* Job Recommendations */}
      <JobRecommendations careerAnalysis={analysis} resumeData={data} />
    </div>
  )
}
