/**
 * 简历上传组件
 * 
 * 作用：提供用户界面，允许用户选择和上传简历文件
 * 目的：处理前端文件选择、上传请求、错误处理和用户反馈
 * 
 * 相关文件：
 * - src/app/api/upload/route.ts  后端 API，处理文件验证和上传
 * - src/app/page.tsx             主页，导入此组件显示
 * - src/components/ui/*          UI 组件库
 * 
 * 功能：
 * 1. 文件选择 - 用户选择 PDF/DOC/DOCX 文件
 * 2. 上传请求 - 发送 FormData 到 /api/upload
 * 3. 状态管理 - loading, error, success 三种状态
 * 4. 错误处理 - try-catch 捕获网络和服务器错误
 * 5. 用户反馈 - 显示上传中/成功/错误的提示信息
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // 最大文件大小：10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  // 处理文件选择，添加前端大小限制
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    
    if (!selectedFile) {
      setFile(null)
      setError(null)
      return
    }

    // 检查文件大小
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("文件不能超过 10MB")
      setFile(null)
      e.target.value = ""  // 清空文件输入
      return
    }

    // 文件合格
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

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      // ❌ 检查 HTTP 状态码
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `上传失败: ${res.status}`)
      }

      const data = await res.json()
      console.log("Upload result:", data)

      // 上传成功
      setSuccess(true)
      setFile(null)  // 清空文件选择

      // 3秒后自动清除成功提示
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      // 捕获所有错误（网络错误、服务器错误、解析错误等）
      const errorMessage = err instanceof Error ? err.message : "上传失败，请重试"
      setError(errorMessage)
      console.error("Upload error:", err)
    } finally {
      // 无论成功还是失败，都停止加载
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>上传你的简历</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          disabled={loading}
        />

        {file && (
          <p className="text-sm text-muted-foreground">
            已选择文件：{file.name}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600">
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
          {loading ? "上传中..." : "上传并分析"}
        </Button>
      </CardContent>
    </Card>
  )
}
