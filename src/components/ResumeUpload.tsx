/**
 * 简历上传组件
 * 
 * 作用：提供用户界面，允许用户选择和上传简历文件
 * 功能：文件选择、上传、错误处理
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ResumeUploadProps {
  onUploadSuccess?: () => void
}

export function ResumeUpload({ onUploadSuccess }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const MAX_FILE_SIZE = 10 * 1024 * 1024

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    
    if (!selectedFile) {
      setFile(null)
      setError(null)
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`文件过大，最大 10MB，当前 ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      setFile(null)
      return
    }

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]
    if (!validTypes.includes(selectedFile.type)) {
      setError("只支持 PDF、DOCX 和 DOC 文件")
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  async function handleUpload() {
    if (!file) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        throw new Error(errorData.error || `上传失败: ${uploadRes.status}`)
      }

      const uploadData = await uploadRes.json()
      console.log("上传成功:", uploadData)

      setSuccess(true)
      setFile(null)

      // 上传成功后调用回调函数刷新列表
      if (onUploadSuccess) {
        onUploadSuccess()
      }

      // 3秒后清除成功提示
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "上传失败，请重试"
      setError(errorMessage)
      console.error("上传错误:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>📄 上传简历</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          disabled={loading}
          className="cursor-pointer"
        />

        {file && (
          <p className="text-sm text-gray-600">
            ✓ 已选择：{file.name}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600 font-medium">
            ✅ 上传成功！
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600">
            ❌ {error}
          </p>
        )}

        <Button
          className="w-full"
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? "上传中..." : "上传简历"}
        </Button>
      </CardContent>
    </Card>
  )
}
