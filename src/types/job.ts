// Raw JSearch API response
export interface JSearchJob {
  job_id: string
  employer_name: string
  employer_logo?: string
  job_title: string
  job_description: string
  job_apply_link: string
  job_city?: string
  job_state?: string
  job_country: string
  job_is_remote: boolean
  job_posted_at_datetime_utc: string
  job_employment_type: string
  job_min_salary?: number
  job_max_salary?: number
  job_salary_currency?: string
}

export interface JSearchResponse {
  status: string
  data: JSearchJob[]
}

// Cleaned job for UI display
export interface JobListing {
  id: string
  title: string
  company: string
  companyLogo?: string
  location: string
  isRemote: boolean
  salaryRange?: string
  applyLink: string
  postedDate: string
  employmentType: string
  track: string // Which career track matched
}

// Cached result
export interface JobRecommendationResult {
  jobs: JobListing[]
  fetchedAt: string
  resumeId: string
  tracksQueried: string[]
}
