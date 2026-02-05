/**
 * Save Structured Resume API
 *
 * Saves ParsedResume JSON to S3
 * Path: resumes/structured/{uuid}.json
 */

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'
import { v4 as uuidv4 } from 'uuid'
import type { ParsedResume } from '@/types/resume'

const MAX_STRING_LENGTH = 10000
const MAX_ARRAY_LENGTH = 100

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0
}

function validateStringField(val: unknown, maxLen = MAX_STRING_LENGTH): boolean {
  return val === undefined || val === null || (typeof val === 'string' && val.length <= maxLen)
}

function validateResumeData(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Resume data must be an object'
  }

  const d = data as Record<string, unknown>

  // Validate personalInfo
  if (d.personalInfo !== undefined && d.personalInfo !== null) {
    if (typeof d.personalInfo !== 'object') return 'personalInfo must be an object'
    const pi = d.personalInfo as Record<string, unknown>
    for (const key of ['name', 'email', 'phone', 'location', 'linkedIn', 'github', 'portfolio']) {
      if (!validateStringField(pi[key], 500)) return `personalInfo.${key} is invalid`
    }
  }

  // Validate summary
  if (!validateStringField(d.summary, MAX_STRING_LENGTH)) return 'summary is too long'

  // Validate arrays don't exceed max length
  for (const key of ['experiences', 'education', 'skills', 'projects']) {
    if (d[key] !== undefined && d[key] !== null) {
      if (!Array.isArray(d[key])) return `${key} must be an array`
      if ((d[key] as unknown[]).length > MAX_ARRAY_LENGTH) return `${key} exceeds max length of ${MAX_ARRAY_LENGTH}`
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return Response.json(
        { ok: false, error: 'Request body too large' },
        { status: 413 }
      )
    }

    const body = await request.json()
    const { data, originalS3Key } = body as {
      data: ParsedResume
      originalS3Key: string
    }

    if (!data) {
      return Response.json(
        { ok: false, error: 'Resume data is required' },
        { status: 400 }
      )
    }

    const validationError = validateResumeData(data)
    if (validationError) {
      return Response.json(
        { ok: false, error: validationError },
        { status: 400 }
      )
    }

    // Generate a unique key for the structured resume
    const uuid = uuidv4()
    const s3Key = `resumes/structured/${uuid}.json`

    // Update the resume's s3Key to point to the new location
    const updatedData: ParsedResume = {
      ...data,
      s3Key,
      reviewedAt: new Date().toISOString(),
    }

    // Convert to JSON string
    const jsonContent = JSON.stringify(updatedData, null, 2)

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: jsonContent,
      ContentType: 'application/json',
      Metadata: {
        originalS3Key: originalS3Key || '',
        savedAt: new Date().toISOString(),
      },
    })

    await s3.send(command)

    // Also generate and save a markdown version for compatibility
    const markdownContent = generateMarkdown(updatedData)
    const mdKey = `resumes/structured/${uuid}.md`

    const mdCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: mdKey,
      Body: markdownContent,
      ContentType: 'text/markdown',
    })

    await s3.send(mdCommand)

    return Response.json({
      ok: true,
      s3Key,
      mdKey,
      message: 'Resume saved successfully',
    })
  } catch (error: any) {
    console.error('Save error:', error)
    return Response.json(
      { ok: false, error: error.message || 'Failed to save resume' },
      { status: 500 }
    )
  }
}

/**
 * Generate markdown from structured resume data
 */
function generateMarkdown(data: ParsedResume): string {
  const lines: string[] = []

  // Personal Info
  if (data.personalInfo) {
    lines.push(`## Personal Information\n`)
    if (data.personalInfo.name) lines.push(data.personalInfo.name)
    const contactParts: string[] = []
    if (data.personalInfo.email) contactParts.push(data.personalInfo.email)
    if (data.personalInfo.phone) contactParts.push(data.personalInfo.phone)
    if (data.personalInfo.location) contactParts.push(data.personalInfo.location)
    if (contactParts.length > 0) lines.push(contactParts.join(' | '))

    const linkParts: string[] = []
    if (data.personalInfo.linkedIn) linkParts.push(data.personalInfo.linkedIn)
    if (data.personalInfo.github) linkParts.push(data.personalInfo.github)
    if (data.personalInfo.portfolio) linkParts.push(data.personalInfo.portfolio)
    if (linkParts.length > 0) lines.push(linkParts.join(' | '))
    lines.push('')
  }

  // Summary
  if (data.summary) {
    lines.push(`## Summary\n`)
    lines.push(data.summary)
    lines.push('')
  }

  // Experience
  if (data.experiences && data.experiences.length > 0) {
    lines.push(`## Experience\n`)
    for (const exp of [...data.experiences].sort((a, b) => a.order - b.order)) {
      const dateRange = exp.isCurrent
        ? `${formatDate(exp.startDate)} - Present`
        : `${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`

      lines.push(`### ${exp.title} | ${exp.company}${exp.location ? ` | ${exp.location}` : ''} | ${dateRange}\n`)

      if (exp.description && exp.description.length > 0) {
        for (const bullet of exp.description) {
          lines.push(`- ${bullet}`)
        }
      }
      lines.push('')
    }
  }

  // Education
  if (data.education && data.education.length > 0) {
    lines.push(`## Education\n`)
    for (const edu of [...data.education].sort((a, b) => a.order - b.order)) {
      const dateRange = `${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}`
      const degreeField = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree

      lines.push(`### ${edu.institution} | ${degreeField}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''} | ${dateRange}\n`)

      if (edu.description && edu.description.length > 0) {
        for (const bullet of edu.description) {
          lines.push(`- ${bullet}`)
        }
      }
      lines.push('')
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    lines.push(`## Skills\n`)

    const categories = ['programming', 'tools', 'soft-skills', 'language', 'other'] as const
    const categoryLabels: Record<string, string> = {
      programming: 'Technical Skills',
      tools: 'Tools & Frameworks',
      'soft-skills': 'Soft Skills',
      language: 'Languages',
      other: 'Other Skills',
    }

    for (const cat of categories) {
      const skills = data.skills.filter((s) => s.category === cat)
      if (skills.length > 0) {
        lines.push(`### ${categoryLabels[cat]}\n`)
        for (const skill of skills) {
          lines.push(`- ${skill.name}`)
        }
        lines.push('')
      }
    }
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    lines.push(`## Projects\n`)
    for (const project of [...data.projects].sort((a, b) => a.order - b.order)) {
      let header = `### ${project.name}`
      if (project.url) header += ` | ${project.url}`
      if (project.startDate) {
        header += ` | ${formatDate(project.startDate)}`
        if (project.endDate !== undefined) {
          header += ` - ${formatDate(project.endDate)}`
        }
      }
      lines.push(`${header}\n`)

      if (project.technologies && project.technologies.length > 0) {
        lines.push(`**Technologies:** ${project.technologies.join(', ')}`)
      }

      if (project.description && project.description.length > 0) {
        for (const bullet of project.description) {
          lines.push(`- ${bullet}`)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function formatDate(date: string | null | undefined): string {
  if (!date) return 'Present'
  const parts = date.split('-')
  if (parts.length >= 2) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    const monthIndex = parseInt(parts[1], 10) - 1
    return `${months[monthIndex] || ''} ${parts[0]}`
  }
  return date
}
