/**
 * 保存编辑后的简历
 * 
 * 作用：将用户编辑后的 markdown 内容保存到 S3，创建新的版本
 * 保存位置：resumes/edited/{UUID}-{originalName}.md
 */

import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, originalS3Key } = body

    if (!content || !originalS3Key) {
      return Response.json(
        { ok: false, error: "content 和 originalS3Key 是必需的" },
        { status: 400 }
      )
    }

    // 从原始 s3Key 提取文件名
    // originalS3Key 格式：resumes/{UUID}-{filename}
    const filenamePart = originalS3Key.split("/").pop() || "resume"
    const originalFilename = filenamePart.replace(/^[a-f0-9\-]+?-/, "")

    // 生成新的 s3 key（编辑版本）
    const editedFileName = `edited-${crypto.randomUUID()}-${originalFilename}.md`
    const editedKey = `resumes/edited/${editedFileName}`

    // 上传到 S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: editedKey,
      Body: content,
      ContentType: "text/markdown; charset=utf-8",
    })

    await s3.send(command)

    return Response.json({
      ok: true,
      key: editedKey,
      message: "简历已保存为新版本",
    })
  } catch (error: any) {
    console.error("保存简历错误:", error)
    return Response.json(
      { ok: false, error: error.message || "保存失败" },
      { status: 500 }
    )
  }
}
