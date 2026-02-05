'use client'

import { Badge } from '@/components/ui/badge'
import type { ParsedResume } from '@/types/resume'

interface ResumePreviewProps {
  data: ParsedResume
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const formatDate = (date: string | null | undefined): string => {
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

  return (
    <div className="prose prose-sm max-w-none bg-white rounded border border-gray-200 p-6">
      {/* Personal Info */}
      {data.personalInfo && (
        <section className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{data.personalInfo.name}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
            {data.personalInfo.phone && <span>| {data.personalInfo.phone}</span>}
            {data.personalInfo.location && <span>| {data.personalInfo.location}</span>}
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-blue-600 mt-1">
            {data.personalInfo.linkedIn && (
              <a href={data.personalInfo.linkedIn} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            )}
            {data.personalInfo.github && (
              <a href={data.personalInfo.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            )}
            {data.personalInfo.portfolio && (
              <a href={data.personalInfo.portfolio} target="_blank" rel="noopener noreferrer">
                Portfolio
              </a>
            )}
          </div>
        </section>
      )}

      {/* Summary */}
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-xl font-bold border-b pb-1 mb-3">Summary</h2>
          <p className="text-gray-700 leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experiences && data.experiences.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold border-b pb-1 mb-3">Experience</h2>
          {data.experiences
            .sort((a, b) => a.order - b.order)
            .map((exp) => (
              <div key={exp.id} className="mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                    <p className="text-gray-600">
                      {exp.company}
                      {exp.location && ` | ${exp.location}`}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(exp.startDate)} - {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}
                  </span>
                </div>
                {exp.description && exp.description.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-gray-700">
                    {exp.description.map((item, i) => (
                      <li key={i} className="mb-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold border-b pb-1 mb-3">Education</h2>
          {data.education
            .sort((a, b) => a.order - b.order)
            .map((edu) => (
              <div key={edu.id} className="mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{edu.institution}</h3>
                    <p className="text-gray-600">
                      {edu.degree}
                      {edu.field && ` in ${edu.field}`}
                      {edu.gpa && ` | GPA: ${edu.gpa}`}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                  </span>
                </div>
                {edu.description && edu.description.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-gray-700">
                    {edu.description.map((item, i) => (
                      <li key={i} className="mb-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </section>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold border-b pb-1 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className={
                  skill.category === 'programming'
                    ? 'bg-blue-100 text-blue-800'
                    : skill.category === 'tools'
                      ? 'bg-green-100 text-green-800'
                      : skill.category === 'soft-skills'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                }
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold border-b pb-1 mb-3">Projects</h2>
          {data.projects
            .sort((a, b) => a.order - b.order)
            .map((project) => (
              <div key={project.id} className="mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {project.name}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 text-sm font-normal"
                        >
                          (Link)
                        </a>
                      )}
                    </h3>
                    {project.technologies && project.technologies.length > 0 && (
                      <p className="text-sm text-gray-500">
                        Tech: {project.technologies.join(', ')}
                      </p>
                    )}
                  </div>
                  {(project.startDate || project.endDate) && (
                    <span className="text-sm text-gray-500">
                      {formatDate(project.startDate)}
                      {project.startDate && ' - '}
                      {formatDate(project.endDate)}
                    </span>
                  )}
                </div>
                {project.description && project.description.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-gray-700">
                    {project.description.map((item, i) => (
                      <li key={i} className="mb-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </section>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <section className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800 mb-2">Parsing Notes</h3>
          <ul className="text-sm text-yellow-700">
            {data.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
