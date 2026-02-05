/**
 * 文本提取 API 路由
 * 
 * 作用：从 S3 中下载文件并提取文本内容
 * 支持：PDF（pdfjs-dist）、DOCX（mammoth）
 */

import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"
import mammoth from "mammoth"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import * as path from "path"
import { pathToFileURL } from "url"
import { buildParsedResume } from "@/lib/resume-parser"
import type { ParsedResume } from "@/types/resume"

// 设置 PDF.js worker - 使用 legacy 构建的本地 worker 文件
const workerPath = path.join(process.cwd(), "public", "pdf.worker.min.mjs")
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href

/**
 * 从 S3 下载文件到 Buffer
 */
async function downloadFromS3(s3Key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    })

    const response = await s3.send(command)
    const chunks: Uint8Array[] = []

    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }
    }

    return Buffer.concat(chunks)
  } catch (error: any) {
    const errorCode = error.Code || error.name || ""
    if (errorCode === "NoSuchKey" || errorCode === "NotFound") {
      throw new Error("文件不存在")
    }
    throw error
  }
}

/**
 * 从 PDF Buffer 提取文本，保留空格和换行，标注 bullet points
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer)
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise
    let fullText = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      // 保留空格和换行的智能连接，标注 bullet points
      let pageText = ""
      let lastY = 0
      let lastX = 0

      for (const item of textContent.items) {
        const itemStr = (item as any).str || ""
        const itemX = (item as any).transform?.[4] || 0
        const itemY = (item as any).transform?.[5] || 0

        // 检查是否是 bullet 符号
        const isBullet = /^[•◦▪■▸▹◾\-\*]$|^\d+[.)]$|^[a-z][.)]$/.test(itemStr)

        // 如果 y 坐标变化超过阈值，表示新行
        if (Math.abs(itemY - lastY) > 5) {
          if (pageText && !pageText.endsWith("\n")) {
            pageText += "\n"
          }
        } 
        // 如果 x 坐标间隔大，插入空格（表示单词间隔）
        else if (itemX - lastX > 3 && pageText && !pageText.endsWith(" ") && !isBullet) {
          pageText += " "
        }

        // 如果是 bullet，添加标记
        if (isBullet) {
          // 确保前面有换行
          if (pageText && !pageText.endsWith("\n")) {
            pageText += "\n"
          }
          pageText += "[BULLET] "
        } else {
          pageText += itemStr
        }

        lastX = itemX + (itemStr.length * 5) // 估算宽度
        lastY = itemY
      }

      fullText += pageText + "\n\n"
    }

    // 转换为 markdown 格式
    const markdown = convertToMarkdown(fullText)
    return markdown
  } catch (error: any) {
    throw new Error(`PDF 文件解析失败: ${error.message}`)
  }
}

/**
 * 将提取的文本转换为 markdown 格式，识别 section titles
 */
function convertToMarkdown(text: string): string {
  // Section 标题关键词映射
  const sectionKeywords: { [key: string]: string } = {
    "personal information": "Personal Information",
    "contact information": "Personal Information",
    "contact details": "Personal Information",
    summary: "Summary",
    objective: "Summary",
    about: "Summary",
    "self description": "Summary",
    profile: "Summary",
    education: "Education",
    academic: "Education",
    degree: "Education",
    experience: "Experience",
    "work experience": "Experience",
    employment: "Experience",
    professional: "Experience",
    skills: "Skills",
    "technical skills": "Skills",
    competencies: "Skills",
    projects: "Projects",
    portfolio: "Projects",
    certifications: "Certifications",
    certificates: "Certifications",
    licenses: "Certifications",
  }

  const lines = text.split("\n").filter(line => line.trim())
  const sections: { title: string; content: string[] }[] = []
  const unrecognized: string[] = []
  
  let currentSection: { title: string; content: string[] } | null = null
  let foundAnySection = false
  let personalInfoLines: string[] = []

  // 首先识别顶部的 Personal Information（包含 email、phone、链接等）
  let lineIndex = 0
  for (let i = 0; i < lines.length && i < 5; i++) {
    const line = lines[i]
    // 检查是否包含联系方式标记：@(email)、+或数字(phone)、http/linkedin(链接)
    const hasEmail = /@/.test(line)
    const hasPhone = /\+|(\(\d+\))|(\d{3}-\d{3})/.test(line)
    const hasLink = /(http|linkedin|github|portfolio|www)/.test(line.toLowerCase())
    const hasLocation = /[A-Z]{2}(?:\s|,|\s*$)/.test(line) // 州或国家代码

    if (hasEmail || hasPhone || hasLink || hasLocation) {
      personalInfoLines.push(line)
      lineIndex = i + 1
    } else if (personalInfoLines.length > 0) {
      // 已经找到 personal info，遇到第一个不符合的行就停止
      break
    }
  }

  // 如果找到了 Personal Information，添加为第一个 section
  if (personalInfoLines.length > 0) {
    sections.push({
      title: "Personal Information",
      content: personalInfoLines
    })
    foundAnySection = true
  }

  // 处理剩余行
  for (let i = lineIndex; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim().toLowerCase()

    // 检查是否是 section title
    let isTitle = false
    let matchedTitle = ""

    for (const [keyword, sectionName] of Object.entries(sectionKeywords)) {
      if (trimmedLine === keyword || trimmedLine.startsWith(keyword + " ") || trimmedLine.endsWith(" " + keyword)) {
        isTitle = true
        matchedTitle = sectionName
        break
      }
    }

    if (isTitle) {
      foundAnySection = true
      // 保存前一个 section
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection)
      }
      // 创建新 section
      currentSection = { title: matchedTitle, content: [] }
    } else {
      // 这是内容行
      if (currentSection) {
        currentSection.content.push(line)
      } else if (foundAnySection) {
        // 找到过 section 但这行没被分组，放入未识别
        unrecognized.push(line)
      } else {
        // 还没找到任何 section，可能是开头的内容
        currentSection = { title: "Summary", content: [line] }
      }
    }
  }

  // 保存最后一个 section
  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection)
  }

  // 构建 markdown
  let markdown = ""
  for (const section of sections) {
    markdown += `## ${section.title}\n\n`
    
    // 如果是 Experience section，需要进一步处理职位分组
    if (section.title === "Experience") {
      const experienceMarkdown = formatExperienceSection(section.content)
      markdown += experienceMarkdown
    } 
    // 如果是 Skills section，需要分类为技术技能和软实力
    else if (section.title === "Skills") {
      const skillsMarkdown = formatSkillsSection(section.content)
      markdown += skillsMarkdown
    } else {
      markdown += section.content.join("\n").trim()
    }
    
    markdown += "\n\n"
  }

  // TODO: 处理无法识别的内容
  // 当前这些内容会被保留但未被格式化
  if (unrecognized.length > 0) {
    markdown += `## Unrecognized Content\n\n`
    markdown += unrecognized.join("\n")
    markdown += "\n\n"
  }

  return markdown.trim()
}

/**
 * 处理 Experience section，识别并分组职位
 */
function formatExperienceSection(lines: string[]): string {
  // 首先合并所有行为一个文本，以便按 [BULLET] 分割
  const fullText = lines.join("\n")
  
  const jobs: { header: string; details: string[] }[] = []
  let currentJob: { header: string; details: string[] } | null = null

  for (const line of lines) {
    // 检查是否是职位头（包含日期和其他信息）
    const isJobHeader = isExperienceHeaderLine(line)

    if (isJobHeader) {
      // 保存前一个职位
      if (currentJob && currentJob.details.length > 0) {
        jobs.push(currentJob)
      }
      // 创建新职位
      currentJob = { header: line, details: [] }
    } else if (currentJob) {
      // 添加到当前职位的详情
      currentJob.details.push(line)
    }
  }

  // 保存最后一个职位
  if (currentJob && currentJob.details.length > 0) {
    jobs.push(currentJob)
  }

  // 构建 markdown
  let markdown = ""
  for (const job of jobs) {
    markdown += `### ${job.header}\n\n`
    
    // 处理职位详情，按 [BULLET] 分割
    const detailText = job.details.join("\n")
    const bulletPoints = detailText.split("[BULLET]").map(p => p.trim()).filter(p => p)
    
    for (const bulletPoint of bulletPoints) {
      // 清理多余空行和符号
      const cleanedPoint = bulletPoint.replace(/^\s*[\-•◦▪■▸▹◾\*]+\s*/, "").trim()
      if (cleanedPoint) {
        markdown += `- ${cleanedPoint}\n`
      }
    }
    markdown += "\n"
  }

  return markdown.trim()
}

/**
 * 处理 Skills section，分类为技术技能和软实力
 */
function formatSkillsSection(lines: string[]): string {
  // 软实力关键词库（相对稳定，词汇固定）
  const softSkillsKeywords = [
    "leadership", "communication", "teamwork", "collaboration", "problem solving", "critical thinking",
    "time management", "project management", "adaptability", "creativity", "analytical", "attention to detail",
    "negotiation", "public speaking", "conflict resolution", "emotional intelligence", "mentoring",
  ]

  // 最常见的技术关键词（核心技术栈）
  const coreTechiKeywords = [
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "php", "ruby", "swift", "kotlin",
    "react", "vue", "angular", "nextjs", "node", "django", "fastapi", "spring", "express",
    "sql", "mysql", "mongodb", "redis", "aws", "gcp", "azure", "docker", "kubernetes", "git",
  ]

  const technicalSkills: string[] = []
  const softSkills: string[] = []
  const unclassified: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 清理 bullet points
    let skill = trimmed.replace(/^[•\-\*\s]+/, "").trim()

    // 检查软实力
    let isSoftSkill = false
    for (const keyword of softSkillsKeywords) {
      if (skill.toLowerCase().includes(keyword)) {
        isSoftSkill = true
        break
      }
    }

    if (isSoftSkill) {
      softSkills.push(skill)
      continue
    }

    // 检查核心技术关键词
    let isTechnical = false
    for (const keyword of coreTechiKeywords) {
      if (skill.toLowerCase().includes(keyword)) {
        isTechnical = true
        break
      }
    }

    if (isTechnical) {
      technicalSkills.push(skill)
      continue
    }

    // 启发式特征识别：检查是否是技术技能
    if (isLikelyTechnicalSkill(skill)) {
      technicalSkills.push(skill)
    } else {
      unclassified.push(skill)
    }
  }

  // 构建 markdown
  let markdown = ""

  if (technicalSkills.length > 0) {
    markdown += "### Technical Skills\n\n"
    for (const skill of technicalSkills) {
      markdown += `- ${skill}\n`
    }
    markdown += "\n"
  }

  if (softSkills.length > 0) {
    markdown += "### Soft Skills\n\n"
    for (const skill of softSkills) {
      markdown += `- ${skill}\n`
    }
    markdown += "\n"
  }

  // TODO: 处理无法分类的技能 - 用户需要确认是否为技术技能
  if (unclassified.length > 0) {
    markdown += "### Other Skills\n\n"
    for (const skill of unclassified) {
      markdown += `- ${skill}\n`
    }
    markdown += "\n"
  }

  return markdown.trim()
}

/**
 * 启发式识别：判断是否可能是技术技能
 * 特征：
 * - 包含特殊字符（如 C++、C#、.NET、F#）
 * - 全大写或包含大写（如 AWS、REST、API、CI/CD）
 * - 包含点号（如 Node.js、Vue.js、.NET）
 * - 包含数字（如 C++、Java8、ES6）
 * - 单个单词且不太长（技术名词通常简洁）
 */
function isLikelyTechnicalSkill(skill: string): boolean {
  // 特殊字符：通常出现在技术名词中
  if (/[+#\-\/\.]/.test(skill)) {
    return true
  }

  // 全大写或以大写开头的短词（如 AWS, REST, API, JSON, XML, HTTP）
  if (/^[A-Z]{2,}$/.test(skill) || /^[A-Z][A-Z0-9]{1,}$/.test(skill)) {
    return true
  }

  // 包含数字的单词（如 Java8, HTML5, ES6, Node.js）
  if (/\d/.test(skill) && skill.length <= 20) {
    return true
  }

  // 单个单词（非空格）且长度合理（3-30字符，技术名词特征）
  // 排除常见的非技术词汇
  if (!/\s/.test(skill) && skill.length >= 3 && skill.length <= 30) {
    const lowerSkill = skill.toLowerCase()
    // 排除明显的自然语言词汇
    const naturalLanguagePatterns = /^(the|and|or|but|for|with|from|about|which|their|there|this|that)$/
    if (!naturalLanguagePatterns.test(lowerSkill)) {
      return true
    }
  }

  return false
}

/**
 * 判断一行是否是经历头（必须包含职位和公司）
 */
function isExperienceHeaderLine(line: string): boolean {
  const trimmed = line.trim()
  
  // 排除 bullet points
  if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("◦") || trimmed.startsWith("▪")) {
    return false
  }
  
  // 职位头通常在 80-200 字符之间
  if (trimmed.length > 200 || trimmed.length < 15) {
    return false
  }
  
  // 必须包含 | 分隔符（简历常见格式）
  if (!/\|/.test(trimmed)) {
    return false
  }
  
  // 将行按 | 分隔
  const parts = trimmed.split("|").map(p => p.trim())
  
  if (parts.length < 2) {
    return false
  }
  
  // 检查是否包含日期（至少一个部分有日期）
  const hasDate = parts.some(part => 
    /\d{4}|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|–|-|to|through/i.test(part)
  )
  
  // 关键词：常见的职位关键词
  const jobTitleKeywords = /engineer|developer|manager|analyst|consultant|designer|architect|lead|senior|junior|intern|director|specialist|coordinator|associate|officer|executive|administrator|supervisor|assistant|technician|officer|scientist|researcher|developer|programmer|administrator/i
  
  // 关键词：常见的公司关键词或格式（大写字母、常见公司名）
  const hasCompanyName = parts.some(part => {
    // 检查是否有多个大写字母开头的单词（公司名特征）
    const capitalWords = (part.match(/\b[A-Z][a-zA-Z]*\b/g) || []).length
    // 或者包含常见公司指示词
    const hasCompanyKeyword = /inc|ltd|corp|llc|gmbh|ag|co\.|company|startup/i.test(part)
    return capitalWords >= 2 || hasCompanyKeyword
  })
  
  // 检查是否包含职位关键词
  const hasJobTitle = parts.some(part => jobTitleKeywords.test(part))
  
  // 必须同时包含职位和公司
  return hasJobTitle && hasCompanyName && hasDate
}

/**
 * 从 DOCX Buffer 提取文本
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error: any) {
    throw new Error(`DOCX 文件解析失败: ${error.message}`)
  }
}

/**
 * POST 请求处理
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { s3Key } = body

    if (!s3Key) {
      return Response.json(
        { ok: false, error: "S3 Key 是必需的" },
        { status: 400 }
      )
    }

    // 获取文件类型
    const ext = s3Key.toLowerCase().split(".").pop()

    // 从 S3 下载
    const buffer = await downloadFromS3(s3Key)
    let text = ""

    // 根据文件类型提取文本
    if (ext === "pdf") {
      text = await extractPdfText(buffer)
    } else if (ext === "docx") {
      text = await extractDocxText(buffer)
    } else {
      return Response.json(
        { ok: false, error: "不支持的文件格式，只支持 PDF 和 DOCX" },
        { status: 400 }
      )
    }

    // 解析为结构化数据
    let structured: ParsedResume | null = null
    try {
      structured = buildParsedResume(text, s3Key)
    } catch (parseError: any) {
      console.error("结构化解析失败:", parseError)
      // 不影响基本功能，继续返回文本
    }

    return Response.json({ ok: true, text, structured })
  } catch (error: any) {
    console.error("提取错误:", error)
    return Response.json(
      { ok: false, error: error.message || "文本提取失败" },
      { status: 500 }
    )
  }
}
