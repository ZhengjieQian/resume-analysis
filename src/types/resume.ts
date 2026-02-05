/**
 * 简历数据类型定义
 * 前后端共用的类型契约
 */

/**
 * 个人信息
 */
export interface PersonalInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  confidence: number; // 0-100 置信度
}

/**
 * 项目经历
 */
export interface Project {
  id: string;
  name: string;
  description: string[]; // Bullet points
  technologies?: string[];
  url?: string;
  startDate?: string; // ISO 8601: YYYY-MM-DD
  endDate?: string | null; // null 表示进行中
  confidence: number; // 0-100 置信度
  order: number; // 显示顺序
  metadata?: {
    parsedBy?: 'rule' | 'nlp' | 'hybrid';
    uncertainFields?: string[];
  };
}

/**
 * 工作经历
 */
export interface Experience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string; // ISO 8601: YYYY-MM-DD
  endDate: string | null; // null 表示 "Present" 或当前职位
  description: string[]; // Bullet points
  isCurrent: boolean; // 是否是当前职位
  confidence: number; // 0-100 置信度
  order: number; // 显示顺序
  metadata?: {
    parsedBy?: 'rule' | 'nlp' | 'hybrid';
    uncertainFields?: string[]; // 不确定的字段列表
  };
}

/**
 * 教育经历
 */
export interface Education {
  id: string;
  institution: string;
  degree: string; // e.g., "Bachelor's", "Master's", "Ph.D."
  field: string; // e.g., "Computer Science"
  startDate: string; // ISO 8601: YYYY-MM-DD
  endDate: string | null;
  gpa?: string;
  description?: string[];
  confidence: number; // 0-100 置信度
  order: number; // 显示顺序
  metadata?: {
    parsedBy?: 'rule' | 'nlp' | 'hybrid';
    uncertainFields?: string[];
  };
}

/**
 * 技能
 */
export interface Skill {
  id: string;
  name: string;
  category?: 'programming' | 'tools' | 'soft-skills' | 'language' | 'other';
  confidence: number; // 0-100 置信度
  frequency?: number; // 在简历中出现的次数
  metadata?: {
    parsedBy?: 'rule' | 'nlp' | 'hybrid';
  };
}

/**
 * 解析后的完整简历
 */
export interface ParsedResume {
  id: string;
  s3Key: string; // 对应的 S3 文件路径
  userId?: string; // 用户 ID（可选）

  // 原始数据
  rawText: string; // 从 PDF/DOCX 提取的原始文本

  // 解析结果
  personalInfo?: PersonalInfo; // 个人信息
  summary?: string; // 个人简介/摘要
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  projects?: Project[]; // 项目经历

  // 元数据
  parsedAt: string; // ISO 8601 时间戳
  overallConfidence: number; // 0-100 整体置信度
  needsReview: boolean; // 是否需要用户审查
  reviewedAt?: string; // 用户审查时间
  reviewedBy?: string; // 审查人 ID

  // 错误和警告
  errors: string[];
  warnings: string[];
}

/**
 * 解析结果 (API 返回格式)
 */
export interface ParseResult {
  success: boolean;
  data: ParsedResume | null;
  error?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * 简历文件记录（数据库存储）
 */
export interface ResumeRecord {
  id: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'docx' | 'doc';
  rawText: string;
  parsedData?: ParsedResume; // 解析后的结构化数据
  uploadedAt: string; // ISO 8601
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  userId?: string;
}

/**
 * 编辑请求（前端发送给后端）
 */
export interface UpdateExperienceRequest {
  id: string;
  company?: string;
  title?: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  description?: string[];
  isCurrent?: boolean;
}

export interface UpdateEducationRequest {
  id: string;
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string | null;
  gpa?: string;
  description?: string[];
}

export interface UpdateSkillRequest {
  id: string;
  name?: string;
  category?: 'programming' | 'tools' | 'soft-skills' | 'language' | 'other';
}

/**
 * 批量操作请求
 */
export interface ReorderExperiencesRequest {
  experiences: Array<{
    id: string;
    order: number;
  }>;
}

/**
 * 日期辅助类型
 */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  isCurrent: boolean;
}

/**
 * 解析配置（未来使用）
 */
export interface ParseConfig {
  parseExperience: boolean;
  parseEducation: boolean;
  parseSkills: boolean;
  supportLanguages?: ('en' | 'zh' | 'es' | 'fr')[]; // 支持语言
  minConfidenceThreshold?: number; // 最低置信度阈值
}
