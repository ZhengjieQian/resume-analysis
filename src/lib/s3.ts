/**
 * AWS S3 客户端初始化配置
 * 
 * 作用：创建和导出 S3 客户端实例
 * 目的：集中管理 AWS S3 连接，避免重复初始化
 * 
 * 相关文件：
 * - src/app/api/upload/route.ts  导入 s3 实例用于文件上传
 * - .env.local                   提供 AWS 凭证和区域配置
 * 
 * 工作原理：
 * 1. 从环境变量读取 AWS 凭证
 * 2. 创建 S3Client 实例
 * 3. 导出供其他模块使用
 */

import { S3Client } from "@aws-sdk/client-s3"

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
