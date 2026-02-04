/**
 * 简历上传 API 路由
 * 
 * 作用：处理来自前端的文件上传请求
 * 目的：验证文件、上传到 AWS S3、返回结果给前端
 * 
 * 相关文件：
 * - src/components/ResumeUpload.tsx  前端组件，发送上传请求
 * - src/lib/s3.ts                    S3 客户端实例
 * - .env.local                       AWS 凭证和配置
 * 
 * API 端点：POST /api/upload
 * 
 * 处理流程：
 * 1. 验证环境变量 - 确保 AWS 配置完整
 * 2. 验证文件大小 - 检查是否超过 10MB
 * 3. 验证文件类型 - 只接受 PDF/DOC/DOCX
 * 4. 上传到 S3 - 使用 PutObjectCommand
 * 5. 返回结果 - 成功返回 key，失败返回错误信息
 * 
 * 错误处理：
 * - 400 Bad Request: 文件不合格（大小、类型）
 * - 500 Internal Server Error: 服务器配置错误或上传失败
 */

import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"
import crypto from "crypto"

// 允许的 MIME 类型
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

// 最大文件大小：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// 验证必要的环境变量
function validateEnv() {
  const required = [
    "S3_BUCKET_NAME",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ]

  const missing: string[] = []

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

export async function POST(req: Request) {
  // 检查环境变量
  const envCheck = validateEnv()
  if (!envCheck.valid) {
    console.error("Missing environment variables:", envCheck.missing)
    return Response.json(
      { error: "服务器配置不完整" },
      { status: 500 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // 验证文件大小（先检查，快速失败，节省资源）
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "文件超过 10MB 限制" },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json(
        { error: "只支持 PDF、DOC、DOCX 文件" },
        { status: 400 }
      )
    }

    // 把浏览器的 File 转成 Node.js Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // 给文件一个唯一 key
    const key = `resumes/${crypto.randomUUID()}-${file.name}`

    // 上传到 S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    return Response.json({
      ok: true,
      key,
    })
  } catch (err: any) {
    // 识别错误类型和代码
    const errorCode = err.Code || err.name || "Unknown"
    const errorMessage = err.message || "Unknown error"

    // 记录详细错误信息供开发者调试
    console.error("Upload error:", {
      code: errorCode,
      message: errorMessage,
      details: err,
    })

    // 根据错误类型返回用户友好的信息
    let userMessage = "上传失败，请稍后重试"
    let statusCode = 500

    // 识别常见的 S3 错误
    if (errorCode === "NoSuchBucket") {
      userMessage = "服务器配置错误"
    } else if (
      errorCode === "InvalidAccessKeyId" ||
      errorCode === "SignatureDoesNotMatch"
    ) {
      userMessage = "服务器配置错误"
    } else if (errorCode === "AccessDenied") {
      userMessage = "服务器权限不足"
    } else if (errorCode === "RequestTimeout") {
      userMessage = "上传超时，请重试"
    } else if (
      errorCode === "NoSuchKey" ||
      errorCode === "NotFound"
    ) {
      userMessage = "文件不存在"
      statusCode = 404
    }

    return Response.json(
      { error: userMessage },
      { status: statusCode }
    )
  }
}
