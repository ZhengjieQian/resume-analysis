export interface TrackRecommendation {
  track: string          // "Frontend", "Backend", "MLE", "Full-Stack", etc.
  fitScore: number       // 0-100
  reasoning: string      // 2-3 sentence explanation
}

export interface SkillGap {
  track: string
  missingSkills: string[]
}

export interface CareerAnalysis {
  recommendedTracks: TrackRecommendation[]
  strengths: string[]
  skillGaps: SkillGap[]
  actionItems: string[]
  overallAssessment: string
  analyzedAt: string     // ISO timestamp
  resumeId: string       // Links to ParsedResume.id
}
