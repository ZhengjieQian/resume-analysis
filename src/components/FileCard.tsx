import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Trash2, FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  uploadedAt: string
  size: string
  s3Key: string
}

interface FileCardProps {
  file: UploadedFile
  onDelete?: (id: string) => void
}

export function FileCard({ file, onDelete }: FileCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)

  const handleView = () => {
    // 使用 URL 编码的 s3Key 作为路由参数
    const encodedKey = encodeURIComponent(file.s3Key)
    router.push(`/resume/${encodedKey}`)
  }

  const handleDownload = () => {
    // TODO: 实现下载功能
    console.log('下载文件:', file.s3Key)
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除 "${file.name}" 吗？`)) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch("/api/file-records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id }),
      })

      if (!res.ok) {
        throw new Error("删除失败")
      }

      if (onDelete) {
        onDelete(file.id)
      }
    } catch (error) {
      console.error("删除文件失败:", error)
      alert("删除文件失败，请重试")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={handleView}>
            <FileText className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate hover:text-blue-600">{file.name}</CardTitle>
              <CardDescription className="text-xs">
                {file.size} • {file.uploadedAt}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="ml-2"
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {/* 详细信息 */}
      {showDetails && (
        <div className="border-t px-6 py-3 bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">S3 存储路径：</p>
          <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all text-gray-800">
            {file.s3Key}
          </p>
        </div>
      )}

      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleView}
          >
            <Eye className="h-4 w-4 mr-2" />
            查看
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            下载
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "删除中" : "删除"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
