"use client"

import { ResumeUpload } from "@/components/ResumeUpload"
import { FileCard } from "@/components/FileCard"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface UploadedFile {
  id: string
  name: string
  uploadedAt: string
  size: string
  s3Key: string
}

export default function HomePage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取已上传的文件列表
    const fetchFiles = async () => {
      try {
        const res = await fetch("/api/files")
        const data = await res.json()
        if (data.ok && data.files) {
          setFiles(data.files)
        }
      } catch (error) {
        console.error("获取文件列表失败:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [])

  const handleDelete = (id: string) => {
    // TODO: 实现删除功能
    setFiles(files.filter(f => f.id !== id))
  }

  const handleUploadSuccess = () => {
    // 刷新文件列表
    const fetchFiles = async () => {
      try {
        const res = await fetch("/api/files")
        const data = await res.json()
        if (data.ok && data.files) {
          setFiles(data.files)
        }
      } catch (error) {
        console.error("刷新文件列表失败:", error)
      }
    }
    fetchFiles()
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">简历分析工具</h1>
          <p className="text-lg text-gray-600">上传您的简历，自动提取和分析内容</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：上传卡片 */}
          <div className="lg:col-span-1">
            <ResumeUpload onUploadSuccess={handleUploadSuccess} />
          </div>

          {/* 右侧：已上传文件列表 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>已上传的文件</CardTitle>
                <CardDescription>
                  共 {files.length} 个文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">加载中...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">还没有上传任何文件</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {files.map(file => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}