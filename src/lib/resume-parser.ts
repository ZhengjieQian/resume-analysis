/**
 * Resume Parser
 * 将 markdown 文本解析为结构化的 ParsedResume 对象
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ParsedResume,
  PersonalInfo,
  Experience,
  Education,
  Skill,
  Project,
} from '@/types/resume';

/**
 * Section 标题关键词映射
 */
const SECTION_KEYWORDS: Record<string, string> = {
  'personal information': 'PersonalInfo',
  'contact information': 'PersonalInfo',
  'contact details': 'PersonalInfo',
  'contact': 'PersonalInfo',
  summary: 'Summary',
  objective: 'Summary',
  about: 'Summary',
  'self description': 'Summary',
  profile: 'Summary',
  education: 'Education',
  academic: 'Education',
  degree: 'Education',
  experience: 'Experience',
  'work experience': 'Experience',
  employment: 'Experience',
  professional: 'Experience',
  'professional experience': 'Experience',
  skills: 'Skills',
  'technical skills': 'Skills',
  competencies: 'Skills',
  projects: 'Projects',
  portfolio: 'Projects',
  certifications: 'Certifications',
  certificates: 'Certifications',
  licenses: 'Certifications',
};

/**
 * 从 markdown 中提取各个 section
 */
function extractSections(markdown: string): Record<string, string[]> {
  const lines = markdown.split('\n');
  const sections: Record<string, string[]> = {};
  let currentSection = 'Unknown';
  let currentContent: string[] = [];

  for (const line of lines) {
    // 检查是否是 ## 标题
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      // 保存前一个 section
      if (currentContent.length > 0) {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push(...currentContent);
      }

      // 确定新 section 类型
      const title = h2Match[1].trim().toLowerCase();
      currentSection = SECTION_KEYWORDS[title] || h2Match[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // 保存最后一个 section
  if (currentContent.length > 0) {
    if (!sections[currentSection]) {
      sections[currentSection] = [];
    }
    sections[currentSection].push(...currentContent);
  }

  return sections;
}

/**
 * 解析个人信息
 */
export function parsePersonalInfo(lines: string[]): PersonalInfo | null {
  if (!lines || lines.length === 0) return null;

  const text = lines.join('\n');
  const info: PersonalInfo = {
    id: uuidv4(),
    name: '',
    confidence: 50,
  };

  // 提取邮箱
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    info.email = emailMatch[0];
    info.confidence += 10;
  }

  // 提取电话
  const phoneMatch = text.match(
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/
  );
  if (phoneMatch) {
    info.phone = phoneMatch[0];
    info.confidence += 10;
  }

  // 提取 LinkedIn
  const linkedInMatch = text.match(/(?:linkedin\.com\/in\/|linkedin:\s*)([^\s,]+)/i);
  if (linkedInMatch) {
    info.linkedIn = linkedInMatch[0];
    info.confidence += 10;
  }

  // 提取 GitHub
  const githubMatch = text.match(/(?:github\.com\/|github:\s*)([^\s,]+)/i);
  if (githubMatch) {
    info.github = githubMatch[0];
    info.confidence += 10;
  }

  // 提取 Portfolio/Website
  const portfolioMatch = text.match(/(?:portfolio|website|www)\.?[:\s]*([^\s,]+)/i);
  if (portfolioMatch) {
    info.portfolio = portfolioMatch[0];
  }

  // 提取位置（城市, 州/国家）
  const locationMatch = text.match(
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/
  );
  if (locationMatch) {
    info.location = locationMatch[0];
    info.confidence += 5;
  }

  // 提取名字 - 第一行通常是名字
  const firstNonEmptyLine = lines.find((l) => l.trim() && !l.startsWith('#'));
  if (firstNonEmptyLine) {
    // 排除明显不是名字的内容（邮箱、电话、链接等）
    const cleaned = firstNonEmptyLine
      .trim()
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '')
      .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .trim();

    if (cleaned && cleaned.length > 1 && cleaned.length < 50) {
      info.name = cleaned;
      info.confidence += 10;
    }
  }

  // 限制置信度在 0-100 之间
  info.confidence = Math.min(100, Math.max(0, info.confidence));

  return info.name || info.email || info.phone ? info : null;
}

/**
 * 解析摘要/简介
 */
export function parseSummary(lines: string[]): string | undefined {
  if (!lines || lines.length === 0) return undefined;

  // 过滤空行并合并为段落
  const filtered = lines.filter((l) => l.trim() && !l.startsWith('#'));
  if (filtered.length === 0) return undefined;

  return filtered.join(' ').trim();
}

/**
 * 解析工作经历
 */
export function parseExperiences(lines: string[]): Experience[] {
  if (!lines || lines.length === 0) return [];

  const experiences: Experience[] = [];
  let currentExp: Partial<Experience> | null = null;
  let currentBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查是否是 ### 子标题（职位头）
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      // 保存前一个经历
      if (currentExp && currentExp.company) {
        currentExp.description = currentBullets;
        experiences.push(currentExp as Experience);
      }

      // 解析职位头
      const header = h3Match[1];
      currentExp = parseExperienceHeader(header);
      currentBullets = [];
      continue;
    }

    // 检查是否是 bullet point
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentExp) {
      currentBullets.push(bulletMatch[1]);
      continue;
    }

    // 如果没有当前经历，尝试将行作为职位头解析
    if (!currentExp) {
      const parsed = parseExperienceHeader(trimmed);
      if (parsed.company || parsed.title) {
        currentExp = parsed;
        currentBullets = [];
      }
    }
  }

  // 保存最后一个经历
  if (currentExp && currentExp.company) {
    currentExp.description = currentBullets;
    experiences.push(currentExp as Experience);
  }

  return experiences;
}

/**
 * 解析经历头（公司 | 职位 | 日期 等格式）
 */
function parseExperienceHeader(header: string): Partial<Experience> {
  const exp: Partial<Experience> = {
    id: uuidv4(),
    company: '',
    title: '',
    description: [],
    isCurrent: false,
    confidence: 50,
    order: 0,
  };

  // 按 | 分割
  const parts = header.split('|').map((p) => p.trim());

  // 日期模式
  const datePattern =
    /(\d{4}|\w+\s+\d{4}|\d{1,2}\/\d{4})\s*[-–]\s*(\d{4}|\w+\s+\d{4}|\d{1,2}\/\d{4}|Present|Current|Now|今)/i;

  // 职位关键词
  const titleKeywords =
    /engineer|developer|manager|analyst|consultant|designer|architect|lead|senior|junior|intern|director|specialist|coordinator|associate|scientist|researcher|programmer|administrator/i;

  for (const part of parts) {
    // 检查日期
    const dateMatch = part.match(datePattern);
    if (dateMatch) {
      exp.startDate = normalizeDate(dateMatch[1]);
      const endDateStr = dateMatch[2];
      if (/present|current|now|今/i.test(endDateStr)) {
        exp.endDate = null;
        exp.isCurrent = true;
      } else {
        exp.endDate = normalizeDate(endDateStr);
      }
      exp.confidence = (exp.confidence || 50) + 15;
      continue;
    }

    // 检查是否是职位
    if (titleKeywords.test(part) && !exp.title) {
      exp.title = part;
      exp.confidence = (exp.confidence || 50) + 15;
      continue;
    }

    // 剩余的可能是公司或位置
    if (!exp.company) {
      exp.company = part;
      exp.confidence = (exp.confidence || 50) + 10;
    } else if (!exp.location) {
      exp.location = part;
    }
  }

  // 如果只有一部分，尝试更宽松的解析
  if (parts.length === 1 && !exp.company && !exp.title) {
    // 尝试用逗号分割
    const commaParts = header.split(',').map((p) => p.trim());
    if (commaParts.length >= 2) {
      exp.company = commaParts[0];
      exp.title = commaParts[1];
    } else {
      exp.company = header;
    }
  }

  exp.confidence = Math.min(100, Math.max(0, exp.confidence || 50));

  return exp;
}

/**
 * 标准化日期为 YYYY-MM-DD 格式
 */
function normalizeDate(dateStr: string): string {
  const monthMap: Record<string, string> = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  // 纯年份
  if (/^\d{4}$/.test(dateStr)) {
    return `${dateStr}-01-01`;
  }

  // MM/YYYY 格式
  const mmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyyMatch) {
    const month = mmyyyyMatch[1].padStart(2, '0');
    return `${mmyyyyMatch[2]}-${month}-01`;
  }

  // Month YYYY 格式
  const monthYearMatch = dateStr.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const month = monthMap[monthYearMatch[1].toLowerCase()] || '01';
    return `${monthYearMatch[2]}-${month}-01`;
  }

  return dateStr;
}

/**
 * 解析教育经历
 */
export function parseEducation(lines: string[]): Education[] {
  if (!lines || lines.length === 0) return [];

  const educationList: Education[] = [];
  let currentEdu: Partial<Education> | null = null;
  let currentDescription: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查是否是 ### 子标题
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (currentEdu && currentEdu.institution) {
        currentEdu.description = currentDescription;
        educationList.push(currentEdu as Education);
      }

      currentEdu = parseEducationHeader(h3Match[1]);
      currentDescription = [];
      continue;
    }

    // 检查 bullet point
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentEdu) {
      currentDescription.push(bulletMatch[1]);
      continue;
    }

    // 如果没有当前教育记录，尝试解析
    if (!currentEdu) {
      const parsed = parseEducationHeader(trimmed);
      if (parsed.institution || parsed.degree) {
        currentEdu = parsed;
        currentDescription = [];
      }
    }
  }

  // 保存最后一条
  if (currentEdu && currentEdu.institution) {
    currentEdu.description = currentDescription;
    educationList.push(currentEdu as Education);
  }

  return educationList;
}

/**
 * 解析教育头
 */
function parseEducationHeader(header: string): Partial<Education> {
  const edu: Partial<Education> = {
    id: uuidv4(),
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: null,
    confidence: 50,
    order: 0,
  };

  const parts = header.split('|').map((p) => p.trim());

  // 学位关键词
  const degreeKeywords =
    /bachelor|master|ph\.?d|doctor|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba|学士|硕士|博士/i;

  // 日期模式
  const datePattern =
    /(\d{4}|\w+\s+\d{4})\s*[-–]\s*(\d{4}|\w+\s+\d{4}|Present|Current|Expected|预计)/i;

  for (const part of parts) {
    // 检查日期
    const dateMatch = part.match(datePattern);
    if (dateMatch) {
      edu.startDate = normalizeDate(dateMatch[1]);
      const endDateStr = dateMatch[2];
      if (/present|current|expected|预计/i.test(endDateStr)) {
        edu.endDate = null;
      } else {
        edu.endDate = normalizeDate(endDateStr);
      }
      edu.confidence = (edu.confidence || 50) + 15;
      continue;
    }

    // 检查学位
    if (degreeKeywords.test(part) && !edu.degree) {
      // 尝试分离学位和专业
      const inMatch = part.match(/(.+?)\s+in\s+(.+)/i);
      if (inMatch) {
        edu.degree = inMatch[1].trim();
        edu.field = inMatch[2].trim();
      } else {
        edu.degree = part;
      }
      edu.confidence = (edu.confidence || 50) + 15;
      continue;
    }

    // GPA
    const gpaMatch = part.match(/gpa[:\s]*(\d+\.?\d*)/i);
    if (gpaMatch) {
      edu.gpa = gpaMatch[1];
      continue;
    }

    // 学校名称（通常包含 University, College, Institute 等）
    if (
      /university|college|institute|school|学院|大学/i.test(part) &&
      !edu.institution
    ) {
      edu.institution = part;
      edu.confidence = (edu.confidence || 50) + 10;
      continue;
    }

    // 剩余内容
    if (!edu.institution) {
      edu.institution = part;
    } else if (!edu.field && !degreeKeywords.test(part)) {
      edu.field = part;
    }
  }

  edu.confidence = Math.min(100, Math.max(0, edu.confidence || 50));

  return edu;
}

/**
 * 解析技能
 */
export function parseSkills(lines: string[]): Skill[] {
  if (!lines || lines.length === 0) return [];

  const skills: Skill[] = [];
  let currentCategory: Skill['category'] = 'other';

  // 软实力关键词
  const softSkillsKeywords = [
    'leadership',
    'communication',
    'teamwork',
    'collaboration',
    'problem solving',
    'critical thinking',
    'time management',
    'project management',
    'adaptability',
    'creativity',
    'analytical',
    'attention to detail',
    'negotiation',
    'public speaking',
    'conflict resolution',
    'emotional intelligence',
    'mentoring',
  ];

  // 技术关键词
  const techKeywords = [
    'python',
    'javascript',
    'typescript',
    'java',
    'c++',
    'c#',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'react',
    'vue',
    'angular',
    'nextjs',
    'node',
    'django',
    'fastapi',
    'spring',
    'express',
    'sql',
    'mysql',
    'mongodb',
    'redis',
    'aws',
    'gcp',
    'azure',
    'docker',
    'kubernetes',
    'git',
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查是否是子标题（技能分类）
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      const categoryName = h3Match[1].toLowerCase();
      if (categoryName.includes('technical') || categoryName.includes('tech')) {
        currentCategory = 'programming';
      } else if (categoryName.includes('soft')) {
        currentCategory = 'soft-skills';
      } else if (categoryName.includes('tool')) {
        currentCategory = 'tools';
      } else if (categoryName.includes('language')) {
        currentCategory = 'language';
      } else {
        currentCategory = 'other';
      }
      continue;
    }

    // 检查 bullet point
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const skillText = bulletMatch ? bulletMatch[1] : trimmed;

    if (skillText.startsWith('#')) continue;

    // 分割多个技能（逗号、分号）
    const skillNames = skillText.split(/[,;]/).map((s) => s.trim());

    for (const name of skillNames) {
      if (!name || name.length < 2) continue;

      // 确定技能类别
      let category: Skill['category'] = currentCategory;
      const lowerName = name.toLowerCase();

      if (softSkillsKeywords.some((k) => lowerName.includes(k))) {
        category = 'soft-skills';
      } else if (techKeywords.some((k) => lowerName.includes(k))) {
        category = 'programming';
      } else if (/[+#.\-\/]/.test(name) || /^[A-Z]{2,}$/.test(name)) {
        category = 'programming';
      }

      skills.push({
        id: uuidv4(),
        name,
        category,
        confidence: 70,
      });
    }
  }

  return skills;
}

/**
 * 解析项目经历
 */
export function parseProjects(lines: string[]): Project[] {
  if (!lines || lines.length === 0) return [];

  const projects: Project[] = [];
  let currentProject: Partial<Project> | null = null;
  let currentBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查 ### 子标题
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (currentProject && currentProject.name) {
        currentProject.description = currentBullets;
        projects.push(currentProject as Project);
      }

      currentProject = parseProjectHeader(h3Match[1]);
      currentBullets = [];
      continue;
    }

    // 检查 bullet point
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentProject) {
      const bulletText = bulletMatch[1];

      // 检查是否是技术栈说明
      if (/^tech|^stack|^built with|^technologies/i.test(bulletText)) {
        const techMatch = bulletText.match(/[:：]\s*(.+)/);
        if (techMatch) {
          currentProject.technologies = techMatch[1].split(/[,，]/).map((t) => t.trim());
        }
      } else {
        currentBullets.push(bulletText);
      }
      continue;
    }

    // 没有当前项目，尝试解析为项目头
    if (!currentProject && !trimmed.startsWith('#')) {
      currentProject = parseProjectHeader(trimmed);
      currentBullets = [];
    }
  }

  // 保存最后一个
  if (currentProject && currentProject.name) {
    currentProject.description = currentBullets;
    projects.push(currentProject as Project);
  }

  return projects;
}

/**
 * 解析项目头
 */
function parseProjectHeader(header: string): Partial<Project> {
  const project: Partial<Project> = {
    id: uuidv4(),
    name: '',
    description: [],
    confidence: 50,
    order: 0,
  };

  const parts = header.split('|').map((p) => p.trim());

  // 日期模式
  const datePattern =
    /(\d{4}|\w+\s+\d{4})\s*[-–]\s*(\d{4}|\w+\s+\d{4}|Present|Current|Ongoing)/i;

  // URL 模式
  const urlPattern = /https?:\/\/[^\s]+/i;

  for (const part of parts) {
    // 检查日期
    const dateMatch = part.match(datePattern);
    if (dateMatch) {
      project.startDate = normalizeDate(dateMatch[1]);
      const endDateStr = dateMatch[2];
      if (/present|current|ongoing/i.test(endDateStr)) {
        project.endDate = null;
      } else {
        project.endDate = normalizeDate(endDateStr);
      }
      project.confidence = (project.confidence || 50) + 15;
      continue;
    }

    // 检查 URL
    const urlMatch = part.match(urlPattern);
    if (urlMatch) {
      project.url = urlMatch[0];
      continue;
    }

    // 项目名称
    if (!project.name) {
      project.name = part;
      project.confidence = (project.confidence || 50) + 20;
    }
  }

  project.confidence = Math.min(100, Math.max(0, project.confidence || 50));

  return project;
}

/**
 * 构建完整的 ParsedResume 对象
 */
export function buildParsedResume(
  markdown: string,
  s3Key: string,
  userId?: string
): ParsedResume {
  const sections = extractSections(markdown);

  const personalInfo = parsePersonalInfo(sections['PersonalInfo'] || []);
  const summary = parseSummary(sections['Summary'] || []);
  const experiences = parseExperiences(sections['Experience'] || []);
  const education = parseEducation(sections['Education'] || []);
  const skills = parseSkills(sections['Skills'] || []);
  const projects = parseProjects(sections['Projects'] || []);

  // 计算各部分置信度的平均值
  const confidences: number[] = [];
  if (personalInfo) confidences.push(personalInfo.confidence);
  experiences.forEach((e) => confidences.push(e.confidence));
  education.forEach((e) => confidences.push(e.confidence));
  skills.forEach((s) => confidences.push(s.confidence));
  projects.forEach((p) => confidences.push(p.confidence));

  const overallConfidence =
    confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 30;

  // 设置 order
  experiences.forEach((e, i) => (e.order = i));
  education.forEach((e, i) => (e.order = i));
  projects.forEach((p, i) => (p.order = i));

  // 检查是否需要审查
  const needsReview = overallConfidence < 70;

  // 收集警告
  const warnings: string[] = [];
  if (!personalInfo) warnings.push('无法解析个人信息');
  if (experiences.length === 0) warnings.push('未找到工作经历');
  if (education.length === 0) warnings.push('未找到教育经历');
  if (skills.length === 0) warnings.push('未找到技能信息');

  return {
    id: uuidv4(),
    s3Key,
    userId,
    rawText: markdown,
    personalInfo: personalInfo || undefined,
    summary,
    experiences,
    education,
    skills,
    projects,
    parsedAt: new Date().toISOString(),
    overallConfidence,
    needsReview,
    errors: [],
    warnings,
  };
}
