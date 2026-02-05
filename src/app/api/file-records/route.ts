/**
 * 文件记录管理 API
 * 
 * 从 S3 中列出所有上传的文件
 * S3 中存储格式：resumes/UUID-原始文件名.pdf
 * 前端显示：只显示原始文件名
 */

import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"

// 从 S3 Key 中提取原始文件名
// 输入：resumes/2b5bb051-54c2-4792-aaf6-cf3b0745c5ed-Zhengjie_Qian.pdf
// 输出：Zhengjie_Qian.pdf
function extractFileName(s3Key: string): string {
  const fileName = (s3Key || "").split("/").pop() || "unknown"
  // 移除 UUID 前缀（UUID-）
  const match = fileName.match(/^[a-f0-9-]+-(.+)$/)
  return match ? match[1] : fileName
}

// GET - 从 S3 列出所有文件
export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: "resumes/",
    })

    const response = await s3.send(command)
    const contents = response.Contents || []

    // 转换为前端需要的格式
    const files = contents
      .filter(obj => obj.Key !== "resumes/") // 排除目录本身
      .map(obj => ({
        id: obj.Key || "", // 使用完整 S3 Key 作为唯一 ID（包含 UUID）
        name: extractFileName(obj.Key || "unknown"), // 只显示原始文件名
        uploadedAt: obj.LastModified ? new Date(obj.LastModified).toLocaleString("zh-CN") : "未知",
        size: obj.Size ? formatFileSize(obj.Size) : "未知",
        s3Key: obj.Key || "", // 完整的 S3 Key（用于下载、删除）
      }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)) // 按时间倒序

    return Response.json({ ok: true, files })
  } catch (error: any) {
    console.error("列出 S3 文件失败:", error)
    return Response.json(
      { ok: false, error: "获取文件列表失败", files: [] },
      { status: 500 }
    )
  }
}

// DELETE - 从 S3 删除文件
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body // id 就是 S3 Key

    if (!id) {
      return Response.json(
        { ok: false, error: "缺少文件 ID" },
        { status: 400 }
      )
    }

    // 删除 S3 中的文件
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: id,
    })

    await s3.send(deleteCommand)

    console.log("从 S3 删除文件:", id)
    return Response.json({ ok: true })
  } catch (error: any) {
    console.error("删除 S3 文件失败:", error)
    return Response.json(
      { ok: false, error: "删除文件失败" },
      { status: 500 }
    )
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
