'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ResumeEditorContainer, ResumePreview } from '@/components/resume'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Download, AlertCircle } from 'lucide-react'
import type { ParsedResume } from '@/types/resume'

type ViewMode = 'preview' | 'edit' | 'raw'

export default function ResumePage() {
  const params = useParams()
  const router = useRouter()
  const s3Key = params.s3Key as string

  const [text, setText] = useState<string | null>(null)
  const [editedText, setEditedText] = useState<string | null>(null)
  const [structured, setStructured] = useState<ParsedResume | null>(null)
  const [editedStructured, setEditedStructured] = useState<ParsedResume | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // localStorage keys
  const textStorageKey = `resume-edit-${s3Key}`
  const structuredStorageKey = `resume-structured-${s3Key}`

  useEffect(() => {
    if (!s3Key) return

    const extractText = async () => {
      try {
        setLoading(true)
        setError(null)

        const decodedKey = decodeURIComponent(s3Key as string)
        const name = decodedKey.split('/').pop() || 'unknown'
        setFileName(name)

        // Check localStorage for saved structured data
        const savedStructured = localStorage.getItem(structuredStorageKey)
        if (savedStructured) {
          try {
            const parsed = JSON.parse(savedStructured) as ParsedResume
            setStructured(parsed)
            setEditedStructured(parsed)
            setText(parsed.rawText)
            setEditedText(parsed.rawText)
            return
          } catch {
            // Invalid JSON, continue to fetch
          }
        }

        // Check localStorage for saved text
        const savedEdit = localStorage.getItem(textStorageKey)
        if (savedEdit) {
          setText(savedEdit)
          setEditedText(savedEdit)
        }

        // Fetch from API
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Key: decodedKey }),
        })

        const data = await res.json()

        if (!data.ok) {
          throw new Error(data.error || 'Text extraction failed')
        }

        // Only update if we don't have local data
        if (!savedEdit) {
          setText(data.text)
          setEditedText(data.text)
        }

        if (data.structured) {
          setStructured(data.structured)
          setEditedStructured(data.structured)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Extraction failed'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    extractText()
  }, [s3Key, textStorageKey, structuredStorageKey])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleStructuredChange = useCallback((data: ParsedResume) => {
    setEditedStructured(data)
    setHasUnsavedChanges(true)
  }, [])

  const handleTextChange = useCallback((value: string) => {
    setEditedText(value)
    setHasUnsavedChanges(true)
  }, [])

  const handleSaveLocal = useCallback(() => {
    if (viewMode === 'edit' && editedStructured) {
      localStorage.setItem(structuredStorageKey, JSON.stringify(editedStructured))
      setStructured(editedStructured)
      setHasUnsavedChanges(false)
      alert('Changes saved locally')
    } else if (viewMode === 'raw' && editedText) {
      localStorage.setItem(textStorageKey, editedText)
      setText(editedText)
      setHasUnsavedChanges(false)
      alert('Changes saved locally')
    }
  }, [viewMode, editedStructured, editedText, structuredStorageKey, textStorageKey])

  const handleSaveToS3 = useCallback(async () => {
    if (!editedStructured && !editedText) return

    try {
      setIsSaving(true)
      const decodedKey = decodeURIComponent(s3Key as string)

      if (viewMode === 'edit' && editedStructured) {
        // Save structured data
        const res = await fetch('/api/save-structured-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: editedStructured,
            originalS3Key: decodedKey,
          }),
        })

        const result = await res.json()
        if (!result.ok) {
          throw new Error(result.error || 'Save failed')
        }

        localStorage.setItem(structuredStorageKey, JSON.stringify(editedStructured))
        setStructured(editedStructured)
      } else if (editedText) {
        // Save raw text
        const res = await fetch('/api/save-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: editedText,
            originalS3Key: decodedKey,
          }),
        })

        const result = await res.json()
        if (!result.ok) {
          throw new Error(result.error || 'Save failed')
        }

        localStorage.setItem(textStorageKey, editedText)
        setText(editedText)
      }

      setHasUnsavedChanges(false)
      alert('Resume saved successfully!')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      alert(`Error: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }, [viewMode, editedStructured, editedText, s3Key, structuredStorageKey, textStorageKey, router])

  const handleDownload = useCallback(() => {
    if (!editedText) return

    const element = document.createElement('a')
    const file = new Blob([editedText], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `resume-${fileName.replace(/\.[^.]+$/, '')}.md`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }, [editedText, fileName])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!text}
            >
              <Download className="h-4 w-4 mr-2" />
              Download MD
            </Button>
          </div>
        </div>

        {/* File info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{fileName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
              {decodeURIComponent(s3Key)}
            </p>
          </CardContent>
        </Card>

        {/* Content area */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Resume Content</CardTitle>
              {hasUnsavedChanges && (
                <span className="text-sm text-yellow-600">Unsaved changes</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">Extracting text...</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && !error && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
                </TabsList>

                <TabsContent value="preview">
                  {editedStructured ? (
                    <ResumePreview data={editedStructured} />
                  ) : text ? (
                    <div className="prose prose-sm max-w-none bg-white rounded border border-gray-200 p-6">
                      <ReactMarkdown
                        components={{
                          h1: ({ ...props }) => (
                            <h1 className="text-2xl font-bold mt-6 mb-3" {...props} />
                          ),
                          h2: ({ ...props }) => (
                            <h2 className="text-xl font-bold mt-5 mb-2" {...props} />
                          ),
                          h3: ({ ...props }) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                          ),
                          p: ({ ...props }) => (
                            <p className="mb-3 text-gray-700 leading-relaxed" {...props} />
                          ),
                          ul: ({ ...props }) => (
                            <ul className="list-disc list-inside mb-3 text-gray-700" {...props} />
                          ),
                          li: ({ ...props }) => (
                            <li className="mb-2" {...props} />
                          ),
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-gray-500">No content available</p>
                  )}
                </TabsContent>

                <TabsContent value="edit">
                  {editedStructured ? (
                    <ResumeEditorContainer
                      data={editedStructured}
                      onChange={handleStructuredChange}
                      onSave={handleSaveToS3}
                      isSaving={isSaving}
                      hasUnsavedChanges={hasUnsavedChanges}
                    />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Structured data not available.</p>
                      <p className="text-sm mt-1">Use Raw mode to edit the markdown directly.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw">
                  <div className="space-y-4">
                    <textarea
                      value={editedText || ''}
                      onChange={(e) => handleTextChange(e.target.value)}
                      className="w-full h-96 p-4 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Edit resume content..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSaveLocal}
                        disabled={isSaving}
                      >
                        Save Locally
                      </Button>
                      <Button
                        onClick={handleSaveToS3}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save to Cloud'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
