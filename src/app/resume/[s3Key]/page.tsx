'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Edit2, Save, X, Download } from 'lucide-react'

export default function ResumePage() {
  const params = useParams()
  const router = useRouter()
  const s3Key = params.s3Key as string

  const [text, setText] = useState<string | null>(null)
  const [editedText, setEditedText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // localStorage key
  const localStorageKey = `resume-edit-${s3Key}`

  useEffect(() => {
    if (!s3Key) return

    const extractText = async () => {
      try {
        setLoading(true)
        setError(null)

        // 解码 s3Key
        const decodedKey = decodeURIComponent(s3Key as string)
        
        // 提取文件名
        const name = decodedKey.split('/').pop() || 'unknown'
        setFileName(name)

        // 首先检查 localStorage 中是否有已保存的编辑内容
        const savedEdit = localStorage.getItem(localStorageKey)
        if (savedEdit) {
          setText(savedEdit)
          setEditedText(savedEdit)
          return
        }

        // 调用提取 API
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Key: decodedKey }),
        })

        const data = await res.json()

        if (!data.ok) {
          throw new Error(data.error || '文本提取失败')
        }

        setText(data.text)
        setEditedText(data.text)
      } catch (err) {
        const message = err instanceof Error ? err.message : '提取失败，请重试'
        setError(message)
        alert(`错误: ${message}`)
      } finally {
        setLoading(false)
      }
    }

    extractText()
  }, [s3Key, localStorageKey])

  const handleEditStart = () => {
    setIsEditing(true)
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditedText(text)
  }

  const handleSaveLocal = () => {
    if (editedText) {
      localStorage.setItem(localStorageKey, editedText)
      setText(editedText)
      setIsEditing(false)
      alert('已保存到本地')
    }
  }

  const handleSaveToS3 = async () => {
    if (!editedText) return

    try {
      setIsSaving(true)
      
      // 保存到 S3
      const res = await fetch('/api/save-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedText,
          originalS3Key: decodeURIComponent(s3Key as string),
        }),
      })

      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.error || '保存失败')
      }

      // 同时保存到本地
      localStorage.setItem(localStorageKey, editedText)
      setText(editedText)
      setIsEditing(false)

      alert('简历已保存为新版本！')
      
      // 可选：刷新文件列表（需要通知父组件）
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请重试'
      alert(`错误: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    if (!editedText) return

    const element = document.createElement('a')
    const file = new Blob([editedText], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `resume-${fileName.replace(/\.[^.]+$/, '')}.md`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        {/* 文件信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📄 {fileName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">S3 存储路径：</p>
            <p className="text-xs font-mono bg-gray-100 p-2 rounded mt-2 break-all">
              {s3Key}
            </p>
          </CardContent>
        </Card>

        {/* 内容区域 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>简历内容</CardTitle>
              {!isEditing && (
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditStart}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                    disabled={!text}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                </div>
              )}
              {isEditing && (
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSaveLocal}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存到本地
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSaveToS3}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? '保存中...' : '保存新版本'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">正在提取文本...</p>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12">
                <p className="text-red-600">❌ {error}</p>
              </div>
            )}

            {isEditing && editedText ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="编辑简历内容..."
              />
            ) : text ? (
              <div className="prose prose-sm max-w-none bg-white rounded border border-gray-200 p-6">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold mt-6 mb-3" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-bold mt-5 mb-2" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-3 text-gray-700 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside mb-3 text-gray-700" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-inside mb-3 text-gray-700" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="mb-2" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />
                    ),
                  }}
                >
                  {text}
                </ReactMarkdown>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
