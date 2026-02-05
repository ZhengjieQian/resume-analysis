'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PersonalInfoEditor } from './PersonalInfoEditor'
import { SummaryEditor } from './SummaryEditor'
import { ExperienceListEditor } from './ExperienceListEditor'
import { EducationListEditor } from './EducationListEditor'
import { SkillsEditor } from './SkillsEditor'
import { ProjectListEditor } from './ProjectListEditor'
import { Save, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { ParsedResume, PersonalInfo } from '@/types/resume'

interface ResumeEditorContainerProps {
  data: ParsedResume
  onChange: (data: ParsedResume) => void
  onSave: () => void
  isSaving?: boolean
  hasUnsavedChanges?: boolean
}

export function ResumeEditorContainer({
  data,
  onChange,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
}: ResumeEditorContainerProps) {
  const handlePersonalInfoChange = (personalInfo: PersonalInfo) => {
    onChange({ ...data, personalInfo })
  }

  const handleSummaryChange = (summary: string) => {
    onChange({ ...data, summary })
  }

  // Ensure personalInfo exists
  const personalInfo: PersonalInfo = data.personalInfo || {
    id: uuidv4(),
    name: '',
    confidence: 100,
  }

  return (
    <div className="space-y-4">
      {/* Header with save button and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Edit Resume</h2>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Unsaved Changes
            </Badge>
          )}
          {data.needsReview && (
            <Badge variant="destructive">Needs Review</Badge>
          )}
        </div>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Confidence indicator */}
      {data.overallConfidence < 70 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some sections may need review. Parsing confidence: {data.overallConfidence}%
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for each section */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg min-h-[400px]">
          <TabsContent value="personal" className="mt-0">
            <PersonalInfoEditor
              data={personalInfo}
              onChange={handlePersonalInfoChange}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-0">
            <SummaryEditor
              data={data.summary || ''}
              onChange={handleSummaryChange}
            />
          </TabsContent>

          <TabsContent value="experience" className="mt-0 pl-10">
            <ExperienceListEditor
              data={data.experiences}
              onChange={(experiences) => onChange({ ...data, experiences })}
            />
          </TabsContent>

          <TabsContent value="education" className="mt-0 pl-10">
            <EducationListEditor
              data={data.education}
              onChange={(education) => onChange({ ...data, education })}
            />
          </TabsContent>

          <TabsContent value="skills" className="mt-0">
            <SkillsEditor
              data={data.skills}
              onChange={(skills) => onChange({ ...data, skills })}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-0 pl-10">
            <ProjectListEditor
              data={data.projects || []}
              onChange={(projects) => onChange({ ...data, projects })}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
