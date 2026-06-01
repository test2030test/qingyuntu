import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ResumeMaterial } from '../services/ai';

export type StageStatus = 'completed' | 'active' | 'locked';

export interface Stage {
  id: number;
  name: string;
  subtitle: string;
  tag: string;
  color: string;
  status: StageStatus;
  progress: number;
  completionReqs: string[];
  currentProgress: { label: string; value: number; total: number }[];
  icon: string;
}

export interface DailyTask {
  id: string;
  type: 'apply' | 'interview' | 'resume' | 'review';
  title: string;
  description: string;
  xp: number;
  completed: boolean;
}

export interface Application {
  id: string;
  company: string;
  companyColor: string;
  position: string;
  status: 'applied' | 'viewed' | 'interview' | 'offer' | 'rejected';
  appliedDate: string;
  waitDays: number;
  stage: number;
  location: string;
  salary: string;
  resumeVersionId?: string;
}

export interface InterviewRecord {
  id: string;
  company: string;
  position: string;
  date: string;
  result: 'passed' | 'failed' | 'pending';
  questions: string[];
  notes: string;
  score: number;
}

export interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  practiced: boolean;
  starTips: string;
}

export interface ResumeEntry {
  id: string;
  company: string;
  companyColor: string;
  position: string;
  period: string;
  bullets: string[];
  skills: string[];
  stage: number;
  isNew?: boolean;
  sourceType?: 'seed' | 'generated';
  sourceApplicationId?: string;
  version?: number;
  isDefault?: boolean;
  sourceResumeVersionId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  xpReward: number;
  unlockedAt?: string;
}

export interface AppUser {
  name: string;
  targetJob: string;
  targetCompany: string;
  university: string;
  grade: string;
  xp: number;
  level: number;
  streak: number;
  totalApplied: number;
  totalInterviews: number;
  matchScore: number;
  hasSetup: boolean;
}

interface JourneySnapshot {
  user: AppUser;
  stages: Stage[];
  dailyTasks: DailyTask[];
  dailyTaskOverrides: Record<string, { title: string; description: string }>;
  applications: Application[];
  interviewRecords: InterviewRecord[];
  questions: Question[];
  resumeMaterials: ResumeMaterial[];
  resumeEntries: ResumeEntry[];
  achievements: Achievement[];
  xiaoYunMessage: string;
  showXiaoYun: boolean;
}

interface PersistedWorkspace {
  activeAccount: string;
  accounts: Record<string, JourneySnapshot>;
}

const STORAGE_KEY = 'qingyun.workspace.v1';

function readStoredWorkspace(): PersistedWorkspace | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkspace;
    if (!parsed || typeof parsed !== 'object' || !parsed.accounts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredWorkspace(workspace: PersistedWorkspace) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

function normalizeJourneySnapshot(snapshot: Partial<JourneySnapshot>): JourneySnapshot {
  const normalizeResumeMaterial = (material: ResumeMaterial): ResumeMaterial => ({
    ...material,
    ...(material.position?.trim() ? {} : (() => {
      const titleParts = material.title.includes('·')
        ? material.title.split('·').map(part => part.trim()).filter(Boolean)
        : [];

      return titleParts.length > 1
        ? { title: titleParts[0], position: titleParts[1] }
        : {};
    })()),
    startDate: material.startDate ?? material.date,
    endDate: material.endDate,
    date: material.date,
  });

  return {
    user: snapshot.user ?? initialUser,
    stages: snapshot.stages ?? initialStages,
    dailyTasks: snapshot.dailyTasks ?? initialDailyTasks,
    dailyTaskOverrides: snapshot.dailyTaskOverrides ?? {},
    applications: snapshot.applications ?? initialApplications,
    interviewRecords: snapshot.interviewRecords ?? initialInterviewRecords,
    questions: snapshot.questions ?? initialQuestions,
    resumeMaterials: (snapshot.resumeMaterials ?? initialResumeMaterials).map(normalizeResumeMaterial),
    resumeEntries: snapshot.resumeEntries ?? initialResumeEntries,
    achievements: snapshot.achievements ?? initialAchievements,
    xiaoYunMessage: snapshot.xiaoYunMessage ?? '今天也要加油哦！每一步都算数 ☁️',
    showXiaoYun: snapshot.showXiaoYun ?? true,
  };
}

function cloneSnapshot(snapshot: JourneySnapshot): JourneySnapshot {
  return {
    user: { ...snapshot.user },
    stages: snapshot.stages.map(stage => ({
      ...stage,
      completionReqs: [...stage.completionReqs],
      currentProgress: stage.currentProgress.map(item => ({ ...item })),
    })),
    dailyTasks: snapshot.dailyTasks.map(task => ({ ...task })),
    dailyTaskOverrides: { ...snapshot.dailyTaskOverrides },
    applications: snapshot.applications.map(app => ({ ...app })),
    interviewRecords: snapshot.interviewRecords.map(record => ({
      ...record,
      questions: [...record.questions],
    })),
    questions: snapshot.questions.map(question => ({ ...question })),
    resumeMaterials: snapshot.resumeMaterials.map(material => ({
      ...material,
      skills: [...material.skills],
    })),
    resumeEntries: snapshot.resumeEntries.map(entry => ({
      ...entry,
      bullets: [...entry.bullets],
      skills: [...entry.skills],
    })),
    achievements: snapshot.achievements.map(achievement => ({ ...achievement })),
    xiaoYunMessage: snapshot.xiaoYunMessage,
    showXiaoYun: snapshot.showXiaoYun,
  };
}

interface AppContextType {
  user: AppUser;
  stages: Stage[];
  dailyTasks: DailyTask[];
  dailyTaskOverrides: Record<string, { title: string; description: string }>;
  applications: Application[];
  interviewRecords: InterviewRecord[];
  questions: Question[];
  resumeMaterials: ResumeMaterial[];
  resumeEntries: ResumeEntry[];
  achievements: Achievement[];
  xiaoYunMessage: string;
  showXiaoYun: boolean;
  completeTask: (taskId: string) => void;
  setHasSetup: (val: boolean) => void;
  setXiaoYunMessage: (msg: string) => void;
  setShowXiaoYun: (val: boolean) => void;
  addApplication: (app: Application) => void;
  updateApplicationStatus: (id: string, status: Application['status']) => void;
  editApplication: (id: string, updates: Partial<Pick<Application, 'location' | 'salary' | 'appliedDate' | 'company' | 'position' | 'companyColor' | 'resumeVersionId'>>) => void;
  toggleQuestion: (id: string) => void;
  updateUser: (updates: Partial<AppUser>) => void;
  updateStageProgress: (stageId: number, progressIndex: number, field: 'value' | 'total', newVal: number) => void;
  initializeJourney: (profile: Partial<AppUser>) => void;
  applyPlan: (plan: StagePlanItem[]) => void;
  seedResumeLibrary: (input: { fileName: string; materials: ResumeMaterial[]; resumeText: string; targetJob: string; targetCompany: string; }) => void;
  generateResumeVersion: () => string | null;
  setDefaultResumeVersion?: (entryId: string) => void;
  savedAccounts: string[];
  loadAccount: (accountName: string) => boolean;
  resetCurrentAccount: () => void;
  exportCurrentAccount: () => { fileName: string; content: string } | null;
  updateDailyTaskOverride: (taskId: string, override: { title: string; description: string }) => void;
  updateResumeMaterial: (index: number, updates: Partial<ResumeMaterial>) => void;
  addResumeMaterial: (material: ResumeMaterial) => void;
}

export interface StagePlanItem {
  stageId: number;
  duration: string;
  targets: { label: string; value: number; unit: string }[];
}

function createStarterDailyTasks(): DailyTask[] {
  return [
    {
      id: 't1',
      type: 'apply',
      title: '补全目标岗位信息',
      description: '先完成个人资料，再开始今天的求职节奏',
      xp: 20,
      completed: false,
    },
    {
      id: 't2',
      type: 'resume',
      title: '整理第一版简历素材',
      description: '把经历梳理清楚，方便后续做简历优化',
      xp: 15,
      completed: false,
    },
    {
      id: 't3',
      type: 'interview',
      title: '练习一道面试题',
      description: '从基础题开始，逐步建立面试手感',
      xp: 15,
      completed: false,
    },
  ];
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '') || '账号';
}

function buildDailyTasksFromPlan(plan: StagePlanItem[]): DailyTask[] {
  const stage1 = plan.find(p => p.stageId === 1);
  const stage2 = plan.find(p => p.stageId === 2);
  const stage3 = plan.find(p => p.stageId === 3);

  const fallback = createStarterDailyTasks();

  const taskFromTarget = (
    id: string,
    type: DailyTask['type'],
    target: StagePlanItem['targets'][number] | undefined,
    stageLabel: string,
    fallbackTask: DailyTask,
  ): DailyTask => {
    if (!target) return fallbackTask;

    const title = `${target.label}${target.value}${target.unit}`;
    const description = `${stageLabel}阶段的重点任务：${target.label}，持续推进 ${target.value}${target.unit}`;
    return {
      ...fallbackTask,
      id,
      type,
      title,
      description,
      completed: false,
    };
  };

  return [
    taskFromTarget('t1', 'apply', stage1?.targets[0], '起步青云', fallback[0]),
    taskFromTarget('t2', 'resume', stage1?.targets[1] ?? stage2?.targets[0], '直上青云', fallback[1]),
    taskFromTarget('t3', 'review', stage2?.targets[1] ?? stage3?.targets[0], '平步青云', fallback[2]),
  ];
}

function calculateStageProgress(stage: Stage, planItem?: StagePlanItem) {
  if (!planItem || planItem.targets.length === 0) {
    return {
      progress: stage.progress,
      status: stage.status,
      currentProgress: stage.currentProgress,
    };
  }

  const currentProgress = planItem.targets.map((target, index) => ({
    label: target.label,
    value: stage.currentProgress[index]?.value ?? 0,
    total: target.value,
  }));

  const ratios = currentProgress.map(item => Math.min(1, item.total > 0 ? item.value / item.total : 0));
  const progress = Math.round((ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length) * 100);

  return {
    progress,
    status: progress >= 100 ? 'completed' : progress > 0 ? 'active' : 'locked',
    currentProgress,
  };
}

function calculateOverallMatchScore(stages: Stage[]) {
  if (stages.length === 0) return 0;
  const score = stages.reduce((sum, stage) => sum + (stage.progress || 0), 0) / stages.length;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function buildDailyTasksFromProfile(profile: AppUser): DailyTask[] {
  const job = profile.targetJob || '目标岗位';
  const company = profile.targetCompany || '目标公司';

  return [
    {
      id: 't1',
      type: 'apply',
      title: `投递 ${company} 相关岗位`,
      description: `围绕 ${job} 的投递清单，优先处理与你目标公司相近的岗位`,
      xp: 20,
      completed: false,
    },
    {
      id: 't2',
      type: 'resume',
      title: `整理 ${job} 简历素材`,
      description: `补充与 ${company} 匹配的经历表达，让简历更贴近目标岗位`,
      xp: 15,
      completed: false,
    },
    {
      id: 't3',
      type: 'interview',
      title: `准备 ${job} 面试题`,
      description: `优先练习与 ${job} 相关的高频题，并补充项目复盘`,
      xp: 15,
      completed: false,
    },
  ];
}

function buildApplicationsFromProfile(profile: AppUser): Application[] {
  void profile;
  return [];
}

function buildResumeEntriesFromProfile(profile: AppUser): ResumeEntry[] {
  void profile;
  return [];
}

function normalizeResumeText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^(?:[-*•·]|\d+[.、]|[一二三四五六七八九十]+[.、])/.test(line))
    .slice(0, 3);
}

function buildResumeSkills(text: string): string[] {
  const keywords = ['需求分析', '产品设计', '用户调研', '数据分析', '竞品分析', 'PRD', 'SQL', 'Excel', '沟通协调', '跨部门协作', '原型设计', '项目管理', '用户增长'];
  const matched = keywords.filter(keyword => text.includes(keyword));

  if (matched.length > 0) {
    return matched.slice(0, 6);
  }

  return ['简历优化'];
}

function buildResumeCardTitle(detail: string, index: number): string {
  const trimmed = detail.replace(/[\s。！？!?,，；;：:]+$/g, '').trim();
  if (!trimmed) return `素材 ${index + 1}`;

  const normalized = trimmed
    .replace(/^(参与|负责|主导|协助|完成|优化|整理|搭建|设计|推进|落地|分析)/, '')
    .trim();

  if (normalized.length <= 12) {
    return normalized || `素材 ${index + 1}`;
  }

  return `${normalized.slice(0, 12)}…`;
}

function buildResumeMaterialFromApplication(app: Application): ResumeMaterial {
  const statusLabels: Record<Application['status'], string> = {
    applied: '已投递',
    viewed: '已查看',
    interview: '已面试',
    offer: '已拿到offer',
    rejected: '已结束',
  };

  const detail = `于 ${app.appliedDate} 向 ${app.company} 投递 ${app.position}，地点：${app.location}，薪资：${app.salary}。`;
  return {
    title: app.company,
    position: app.position,
    detail,
    skills: [statusLabels[app.status]],
    startDate: app.appliedDate,
  };
}

function buildResumeMaterialPeriod(material: ResumeMaterial): string {
  const start = material.startDate ?? material.date ?? '';
  const end = material.endDate?.trim();

  if (!start) return '';
  return `${start} - ${end || '至今'}`;
}

function buildSeedResumeEntry(input: { fileName: string; resumeText: string; materials: ResumeMaterial[]; targetJob: string; targetCompany: string; }): ResumeEntry {
  const materialBullets = input.materials
    .slice(0, 6)
    .map((material, index) => {
      const positionText = material.position?.trim() ? ` · ${material.position.trim()}` : '';
      const periodText = buildResumeMaterialPeriod(material);
      const periodSuffix = periodText ? `（${periodText}）` : '';
      return `${index + 1}. ${material.title}${positionText}${periodSuffix}：${material.detail}`;
    });

  const bullets = materialBullets.length > 0 ? materialBullets : normalizeResumeText(input.resumeText);
  const safeBullets = bullets.length > 0
    ? bullets
    : ['已完成 AI 简历分析，准备进入青云起航。', '上传的简历会作为初始版本保留。'];

  const derivedSkills = Array.from(new Set([
    ...input.materials.flatMap(material => material.skills),
    ...buildResumeSkills(input.resumeText),
  ])).slice(0, 6);

  return {
    id: 'v1',
    company: '阶段一简历',
    companyColor: '#F59E0B',
    position: input.fileName ? `阶段一版 · ${input.fileName.replace(/\.[^.]+$/, '')}` : '阶段一版',
    period: input.materials.length > 0
      ? `阶段一版 · ${buildResumeMaterialPeriod(input.materials[0]) || '待整理'}`
      : '阶段一版',
    bullets: safeBullets,
    skills: derivedSkills.length > 0 ? derivedSkills : buildResumeSkills(input.resumeText),
    stage: 1,
    isNew: false,
    sourceType: 'seed',
    version: 1,
    isDefault: true,
  };
}

function buildResumeVersionFromMaterials(baseEntry: ResumeEntry, materials: ResumeMaterial[], nextVersion: number): ResumeEntry {
  const materialBullets = materials
    .slice(0, 5)
    .map((material, index) => `${index + 1}. ${material.title}：${material.detail}`);

  const combinedBullets = [
    ...baseEntry.bullets.slice(0, 2),
    ...materialBullets,
  ].slice(0, 6);

  const combinedSkills = Array.from(new Set([
    ...baseEntry.skills,
    ...materials.flatMap(material => material.skills),
  ])).slice(0, 6);

  return {
    ...baseEntry,
    id: `v${nextVersion}`,
    company: baseEntry.company,
    position: `优化版 v${nextVersion}`,
    period: `第 ${nextVersion} 版简历`,
    bullets: combinedBullets.length > 0 ? combinedBullets : baseEntry.bullets,
    skills: combinedSkills.length > 0 ? combinedSkills : baseEntry.skills,
    version: nextVersion,
    isDefault: false,
    sourceType: 'generated',
    sourceResumeVersionId: baseEntry.id,
  };
}

function buildApplicationResumeEntry(app: Application, versionIndex: number): ResumeEntry {
  const statusLabels: Record<Application['status'], string> = {
    applied: '已投递',
    viewed: '已查看',
    interview: '面试中',
    offer: 'Offer',
    rejected: '已结束',
  };

  const bulletMap: Record<Application['status'], string[]> = {
    applied: [
      `完成 ${app.company} 的 ${app.position} 投递`,
      `当前状态：${statusLabels[app.status]}，继续关注岗位反馈`,
    ],
    viewed: [
      `${app.company} 已查看简历，等待下一步反馈`,
      '继续补充经历素材，提升简历表达清晰度',
    ],
    interview: [
      `进入 ${app.company} 面试流程，重点准备岗位匹配点`,
      '整理项目复盘与 STAR 表达，提升面试稳定性',
    ],
    offer: [
      `成功拿到 ${app.company} 的 Offer`,
      '沉淀这段经历，形成后续版本简历的高光素材',
    ],
    rejected: [
      `在 ${app.company} 的投递已结束`,
      '复盘失败原因，提炼下一轮投递的优化点',
    ],
  };

  const skillMap: Record<Application['status'], string[]> = {
    applied: ['投递跟进', '岗位匹配', '简历优化'],
    viewed: ['投递跟进', '岗位匹配', '简历优化'],
    interview: ['面试准备', 'STAR 表达', '项目复盘'],
    offer: ['结果沉淀', '高光经历', '版本优化'],
    rejected: ['复盘总结', '经历提炼', '下一轮优化'],
  };

  return {
    id: `v${versionIndex}`,
    company: app.company,
    companyColor: app.companyColor,
    position: app.position,
    period: `${statusLabels[app.status]} · ${app.appliedDate}`,
    bullets: bulletMap[app.status],
    skills: skillMap[app.status],
    stage: app.stage,
    isNew: app.status === 'offer' || app.status === 'interview',
    sourceType: 'generated',
    sourceApplicationId: app.id,
    version: versionIndex,
    isDefault: false,
  };
}

const initialUser: AppUser = {
  name: '',
  targetJob: '',
  targetCompany: '',
  university: '',
  grade: '',
  xp: 0,
  level: 1,
  streak: 0,
  totalApplied: 0,
  totalInterviews: 0,
  matchScore: 0,
  hasSetup: false,
};

const initialStages: Stage[] = [
  {
    id: 1,
    name: '起步青云',
    subtitle: '入门实习，补空白、建节奏',
    tag: '阶段一',
    color: '#12B898',
    status: 'locked',
    progress: 0,
    completionReqs: ['投递≥5家', '完成1次面试复盘'],
    icon: '✓',
    currentProgress: [
      { label: '投递数', value: 0, total: 5 },
      { label: '复盘次数', value: 0, total: 1 },
    ],
  },
  {
    id: 2,
    name: '直上青云',
    subtitle: '进阶实习，练能力、贴目标',
    tag: '阶段二',
    color: '#2AC59D',
    status: 'locked',
    progress: 0,
    completionReqs: ['简历更新≥2条经历', '投递≥5家'],
    icon: '↑',
    currentProgress: [
      { label: '经历更新', value: 0, total: 2 },
      { label: '投递数', value: 0, total: 5 },
    ],
  },
  {
    id: 3,
    name: '平步青云',
    subtitle: '冲刺实习，高含金量、冲秋招',
    tag: '阶段三',
    color: '#70DAAA',
    status: 'locked',
    progress: 0,
    completionReqs: ['完成阶段二', 'JD匹配度≥70%'],
    icon: '⚡',
    currentProgress: [],
  },
  {
    id: 4,
    name: '青云上岸',
    subtitle: '秋招正式投递，平步青云',
    tag: '终局',
    color: '#F59E0B',
    status: 'locked',
    progress: 0,
    completionReqs: ['完成阶段三', '简历最终版确认'],
    icon: '🏆',
    currentProgress: [],
  },
];

const initialDailyTasks: DailyTask[] = createStarterDailyTasks();

const initialApplications: Application[] = [
  {
    id: 'a1',
    company: '腾讯',
    companyColor: '#1DB954',
    position: '产品实习生',
    status: 'interview',
    appliedDate: '2025-04-22',
    waitDays: 3,
    stage: 2,
    location: '深圳',
    salary: '200元/天',
  },
  {
    id: 'a2',
    company: '字节跳动',
    companyColor: '#FF6B35',
    position: '产品经理实习',
    status: 'viewed',
    appliedDate: '2025-04-25',
    waitDays: 5,
    stage: 2,
    location: '北京',
    salary: '250元/天',
  },
  {
    id: 'a3',
    company: '阿里巴巴',
    companyColor: '#FF6900',
    position: 'B端产品实习',
    status: 'applied',
    appliedDate: '2025-04-28',
    waitDays: 2,
    stage: 2,
    location: '杭州',
    salary: '220元/天',
  },
  {
    id: 'a4',
    company: '网易',
    companyColor: '#CC0000',
    position: '游戏产品实习',
    status: 'rejected',
    appliedDate: '2025-04-15',
    waitDays: 0,
    stage: 1,
    location: '广州',
    salary: '180元/天',
  },
  {
    id: 'a5',
    company: '美团',
    companyColor: '#FFD700',
    position: '运营产品实习',
    status: 'offer',
    appliedDate: '2025-04-05',
    waitDays: 0,
    stage: 1,
    location: '北京',
    salary: '200元/天',
  },
];

const initialInterviewRecords: InterviewRecord[] = [
  {
    id: 'i1',
    company: '美团',
    position: '运营产品实习',
    date: '2025-04-12',
    result: 'passed',
    questions: ['自我介绍', '描述一个你主导的产品功能', '如何做用户调研'],
    notes: '面试官很和蔼，重点考察用户思维。下次准备更多数据支撑。',
    score: 85,
  },
  {
    id: 'i2',
    company: '网易',
    position: '游戏产品实习',
    date: '2025-04-18',
    result: 'failed',
    questions: ['竞品分析框架', '设计一个游戏社交功能', '用数据驱动决策的案例'],
    notes: '对游戏行业了解不深，竞品分析不够具体。需要补充行业知识。',
    score: 58,
  },
];

const initialQuestions: Question[] = [
  {
    id: 'q1',
    text: '请介绍一个你主导或深度参与的产品功能，从需求到上线的完整过程',
    category: '产品经验',
    difficulty: 'medium',
    practiced: false,
    starTips: 'S: 描述背景和用户痛点 | T: 你的目标和职责 | A: 具体行动和方法论 | R: 量化结果（DAU/转化率/NPS）',
  },
  {
    id: 'q2',
    text: '如何做用户调研？说说你的方法论和实际经验',
    category: '用户研究',
    difficulty: 'easy',
    practiced: false,
    starTips: 'S: 说明调研的背景场景 | T: 调研目标是什么 | A: 用了哪些调研方法 | R: 调研结果如何影响决策',
  },
  {
    id: 'q3',
    text: '请对微信朋友圈进行竞品分析，并提出一个改进建议',
    category: '竞品分析',
    difficulty: 'hard',
    practiced: false,
    starTips: '分析维度：用户群体/核心功能/商业模式/体验对比 | 改进需基于数据和用户痛点',
  },
  {
    id: 'q4',
    text: '你如何用数据驱动产品决策？举一个具体案例',
    category: '数据思维',
    difficulty: 'medium',
    practiced: false,
    starTips: 'S: 面临的问题是什么 | T: 需要做什么决策 | A: 收集了哪些数据，如何分析 | R: 基于数据的决策结果',
  },
  {
    id: 'q5',
    text: '如果用户留存率下降了20%，你会怎么排查原因？',
    category: '数据思维',
    difficulty: 'hard',
    practiced: false,
    starTips: '思路：拆分漏斗→定位问题层→假设验证→行动建议 | 记得分维度（渠道/功能/时间）',
  },
  {
    id: 'q6',
    text: '说说你对产品经理核心职责的理解',
    category: '职业认知',
    difficulty: 'easy',
    practiced: false,
    starTips: '核心：发现用户需求→定义问题→协作解决→度量价值 | 强调沟通、判断力和商业意识',
  },
];

const initialResumeMaterials: ResumeMaterial[] = [];
const initialResumeEntries: ResumeEntry[] = [];

const initialAchievements: Achievement[] = [
  { id: 'ac1', title: '初出茅庐', description: '完成第一次投递', emoji: '🚀', unlocked: false, xpReward: 50 },
  { id: 'ac2', title: '投递达人', description: '累计投递10家', emoji: '📮', unlocked: false, xpReward: 100 },
  { id: 'ac3', title: '复盘能手', description: '完成5次面试复盘', emoji: '📝', unlocked: false, xpReward: 80 },
  { id: 'ac4', title: '阶段通关', description: '完成起步青云阶段', emoji: '⭐', unlocked: false, xpReward: 200 },
  { id: 'ac5', title: '连胜之星', description: '连续打卡7天', emoji: '🔥', unlocked: false, xpReward: 150 },
  { id: 'ac6', title: '面试老手', description: '完成10次面试练习', emoji: '🎯', unlocked: false, xpReward: 120 },
  { id: 'ac7', title: '简历达人', description: '简历更新达到5条经历', emoji: '📄', unlocked: false, xpReward: 100 },
  { id: 'ac8', title: '青云之路', description: '完成所有三个阶段', emoji: '🌟', unlocked: false, xpReward: 500 },
];

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const storedWorkspace = readStoredWorkspace();
  const storedSnapshot = storedWorkspace?.activeAccount ? storedWorkspace.accounts[storedWorkspace.activeAccount] : null;
  const normalizedStoredSnapshot = storedSnapshot ? normalizeJourneySnapshot(storedSnapshot) : null;

  const [user, setUser] = useState<AppUser>(normalizedStoredSnapshot?.user ?? initialUser);
  const [stages, setStages] = useState<Stage[]>(normalizedStoredSnapshot?.stages ?? initialStages);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(normalizedStoredSnapshot?.dailyTasks ?? initialDailyTasks);
  const [dailyTaskOverrides, setDailyTaskOverrides] = useState<Record<string, { title: string; description: string }>>(normalizedStoredSnapshot?.dailyTaskOverrides ?? {});
  const [applications, setApplications] = useState<Application[]>(normalizedStoredSnapshot?.applications ?? initialApplications);
  const [interviewRecords] = useState<InterviewRecord[]>(normalizedStoredSnapshot?.interviewRecords ?? initialInterviewRecords);
  const [questions, setQuestions] = useState<Question[]>(normalizedStoredSnapshot?.questions ?? initialQuestions);
  const [resumeMaterials, setResumeMaterials] = useState<ResumeMaterial[]>(normalizedStoredSnapshot?.resumeMaterials ?? initialResumeMaterials);
  const [resumeEntries, setResumeEntries] = useState<ResumeEntry[]>(normalizedStoredSnapshot?.resumeEntries ?? initialResumeEntries);
  const [achievements] = useState<Achievement[]>(normalizedStoredSnapshot?.achievements ?? initialAchievements);
  const [xiaoYunMessage, setXiaoYunMessage] = useState(normalizedStoredSnapshot?.xiaoYunMessage ?? '今天也要加油哦！每一步都算数 ☁️');
  const [showXiaoYun, setShowXiaoYun] = useState(normalizedStoredSnapshot?.showXiaoYun ?? true);
  const [savedAccounts, setSavedAccounts] = useState<string[]>(() => Object.keys(storedWorkspace?.accounts ?? {}));

  const persistCurrentSnapshot = (accountName: string, snapshot: JourneySnapshot) => {
    if (!accountName.trim()) return;

    const workspace = readStoredWorkspace() ?? { activeAccount: accountName, accounts: {} };
    workspace.activeAccount = accountName;
    workspace.accounts[accountName] = cloneSnapshot(snapshot);
    writeStoredWorkspace(workspace);
    setSavedAccounts(Object.keys(workspace.accounts));
  };

  const loadAccount = (accountName: string) => {
    const workspace = readStoredWorkspace();
    const snapshot = workspace?.accounts[accountName];
    if (!workspace || !snapshot) return false;

    const normalizedSnapshot = normalizeJourneySnapshot(snapshot);

    setUser(normalizedSnapshot.user);
    setStages(normalizedSnapshot.stages);
    setDailyTasks(normalizedSnapshot.dailyTasks);
    setDailyTaskOverrides(normalizedSnapshot.dailyTaskOverrides);
    setApplications(normalizedSnapshot.applications);
    setQuestions(normalizedSnapshot.questions);
    setResumeMaterials(normalizedSnapshot.resumeMaterials);
    setResumeEntries(normalizedSnapshot.resumeEntries);
    setXiaoYunMessage(normalizedSnapshot.xiaoYunMessage);
    setShowXiaoYun(normalizedSnapshot.showXiaoYun);
    setSavedAccounts(Object.keys(workspace.accounts));
    workspace.accounts[accountName] = cloneSnapshot(normalizedSnapshot);
    writeStoredWorkspace({ activeAccount: accountName, accounts: workspace.accounts });
    return true;
  };

  const resetCurrentAccount = () => {
    const accountName = user.name.trim();
    if (!accountName) return;

    const workspace = readStoredWorkspace();
    if (!workspace) {
      setUser(initialUser);
      setStages(initialStages);
      setDailyTasks(initialDailyTasks);
      setDailyTaskOverrides({});
      setApplications(initialApplications);
      setQuestions(initialQuestions);
      setResumeMaterials(initialResumeMaterials);
      setResumeEntries(initialResumeEntries);
      setXiaoYunMessage('今天也要加油哦！每一步都算数 ☁️');
      setShowXiaoYun(true);
      return;
    }

    delete workspace.accounts[accountName];
    const remainingAccounts = Object.keys(workspace.accounts);
    workspace.activeAccount = remainingAccounts[0] ?? '';
    writeStoredWorkspace(workspace);
    setSavedAccounts(remainingAccounts);

    if (workspace.activeAccount) {
      loadAccount(workspace.activeAccount);
      return;
    }

    setUser(initialUser);
    setStages(initialStages);
    setDailyTasks(initialDailyTasks);
    setDailyTaskOverrides({});
    setApplications(initialApplications);
    setQuestions(initialQuestions);
    setResumeMaterials(initialResumeMaterials);
    setResumeEntries(initialResumeEntries);
    setXiaoYunMessage('今天也要加油哦！每一步都算数 ☁️');
    setShowXiaoYun(true);
  };

  const exportCurrentAccount = () => {
    const accountName = user.name.trim();
    if (!accountName) return null;

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accountName,
      snapshot: cloneSnapshot({
        user,
        stages,
        dailyTasks,
        dailyTaskOverrides,
        applications,
        interviewRecords,
        questions,
        resumeMaterials,
        resumeEntries,
        achievements,
        xiaoYunMessage,
        showXiaoYun,
      }),
    };

    return {
      fileName: `青云路径-${sanitizeFileName(accountName)}.json`,
      content: JSON.stringify(payload, null, 2),
    };
  };

  useEffect(() => {
    if (!user.hasSetup) return;
    const accountName = user.name.trim();
    if (!accountName) return;
    persistCurrentSnapshot(accountName, {
      user,
      stages,
      dailyTasks,
      dailyTaskOverrides,
      applications,
      interviewRecords,
      questions,
      resumeMaterials,
      resumeEntries,
      achievements,
      xiaoYunMessage,
      showXiaoYun,
    });
  }, [user, stages, dailyTasks, dailyTaskOverrides, applications, interviewRecords, questions, resumeMaterials, resumeEntries, achievements, xiaoYunMessage, showXiaoYun]);

  const completeTask = (taskId: string) => {
    setDailyTasks(prev => prev.map(t => {
      if (t.id === taskId && !t.completed) {
        setUser(u => ({ ...u, xp: u.xp + t.xp }));
        setXiaoYunMessage('太棒了！又完成一个任务，离青云更近一步！✨');
        return { ...t, completed: true };
      }
      return t;
    }));
  };

  const setHasSetup = (val: boolean) => setUser(u => ({ ...u, hasSetup: val }));

  const addApplication = (app: Application) => {
    setApplications(prev => [app, ...prev]);
    setResumeMaterials(prev => [buildResumeMaterialFromApplication(app), ...prev]);
    setUser(u => ({ ...u, totalApplied: u.totalApplied + 1 }));
  };

  const updateApplicationStatus = (id: string, status: Application['status']) => {
    setApplications(prev => {
      let prevStatus: Application['status'] | null = null;
      const nextApplications = prev.map(a => {
        if (a.id !== id) return a;
        prevStatus = a.status;
        return { ...a, status };
      });

      if (prevStatus === null) return prev;

      // Update derived user metrics based on status transition
      setUser(u => {
        let totalInterviews = u.totalInterviews;
        if (prevStatus !== 'interview' && status === 'interview') totalInterviews = u.totalInterviews + 1;
        if (prevStatus === 'interview' && status !== 'interview') totalInterviews = Math.max(0, u.totalInterviews - 1);

        return { ...u, totalInterviews };
      });

      return nextApplications;
    });
  };

  const editApplication = (id: string, updates: Partial<Pick<Application, 'location' | 'salary' | 'appliedDate' | 'company' | 'position' | 'companyColor' | 'resumeVersionId'>>) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const updateDailyTaskOverride = (taskId: string, override: { title: string; description: string }) => {
    setDailyTaskOverrides(prev => {
      const next = {
        ...prev,
        [taskId]: {
          title: override.title.trim() || '未命名任务',
          description: override.description.trim() || '暂无描述',
        },
      };

      // Persist immediately if we have an account name
      const accountName = user.name.trim();
      if (accountName) {
        try {
          persistCurrentSnapshot(accountName, {
            user,
            stages,
            dailyTasks,
            dailyTaskOverrides: next,
            applications,
            interviewRecords,
            questions,
            resumeMaterials,
            resumeEntries,
            achievements,
            xiaoYunMessage,
            showXiaoYun,
          });
        } catch (e) {
          // ignore persistence errors here
        }
      }

      return next;
    });
  };

  const updateResumeMaterial = (index: number, updates: Partial<ResumeMaterial>) => {
    setResumeMaterials(prev => {
      const next = prev.map((m, i) => i === index ? { ...m, ...updates } : m);

      // persist immediately if we have an account name
      const accountName = user.name.trim();
      if (accountName) {
        try {
          persistCurrentSnapshot(accountName, {
            user,
            stages,
            dailyTasks,
            dailyTaskOverrides,
            applications,
            interviewRecords,
            questions,
            resumeMaterials: next,
            resumeEntries,
            achievements,
            xiaoYunMessage,
            showXiaoYun,
          });
        } catch (e) {
          // ignore
        }
      }

      return next;
    });
  };

  const addResumeMaterial = (material: ResumeMaterial) => {
    setResumeMaterials(prev => {
      const next = [material, ...prev];

      const accountName = user.name.trim();
      if (accountName) {
        try {
          persistCurrentSnapshot(accountName, {
            user,
            stages,
            dailyTasks,
            dailyTaskOverrides,
            applications,
            interviewRecords,
            questions,
            resumeMaterials: next,
            resumeEntries,
            achievements,
            xiaoYunMessage,
            showXiaoYun,
          });
        } catch {
          // ignore
        }
      }

      return next;
    });
  };

  const toggleQuestion = (id: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, practiced: !q.practiced } : q));
  };

  const updateUser = (updates: Partial<AppUser>) => setUser(u => ({ ...u, ...updates }));

  const initializeJourney = (profile: Partial<AppUser>) => {
    const nextUser: AppUser = {
      ...initialUser,
      ...profile,
      hasSetup: true,
      xp: profile.xp ?? 0,
      level: profile.level ?? 1,
      streak: profile.streak ?? 0,
      totalApplied: profile.totalApplied ?? 0,
      totalInterviews: profile.totalInterviews ?? 0,
      matchScore: profile.matchScore ?? 0,
    };

    setUser(nextUser);
    setStages(initialStages.map(stage => ({
      ...stage,
      status: 'locked',
      progress: 0,
      currentProgress: stage.currentProgress.map(item => ({ ...item, value: 0 })),
    })));
    setDailyTasks(buildDailyTasksFromProfile(nextUser));
    setDailyTaskOverrides({});
    setApplications(buildApplicationsFromProfile(nextUser));
    setResumeMaterials(initialResumeMaterials);
    setResumeEntries(buildResumeEntriesFromProfile(nextUser));

    persistCurrentSnapshot(nextUser.name.trim(), {
      user: nextUser,
      stages: initialStages.map(stage => ({
        ...stage,
        status: 'locked',
        progress: 0,
        currentProgress: stage.currentProgress.map(item => ({ ...item, value: 0 })),
      })),
      dailyTasks: buildDailyTasksFromProfile(nextUser),
      applications: buildApplicationsFromProfile(nextUser),
      interviewRecords: initialInterviewRecords,
      questions: initialQuestions,
      resumeMaterials: initialResumeMaterials,
      resumeEntries: buildResumeEntriesFromProfile(nextUser),
      achievements: initialAchievements,
      xiaoYunMessage,
      showXiaoYun,
    });
  };

  const updateStageProgress = (stageId: number, progressIndex: number, field: 'value' | 'total', newVal: number) => {
    setStages(prev => {
      const next = prev.map(s => {
        if (s.id !== stageId) return s;
        const updated = [...s.currentProgress];
        updated[progressIndex] = { ...updated[progressIndex], [field]: Math.max(0, newVal) };

        // compute progress and status from updated currentProgress
        const ratios = updated.map(item => Math.min(1, item.total > 0 ? item.value / item.total : 0));
        const progress = updated.length > 0 ? Math.round((ratios.reduce((sum, r) => sum + r, 0) / updated.length) * 100) : 0;
        const status: Stage['status'] = progress >= 100 ? 'completed' : progress > 0 ? 'active' : 'locked';

        return { ...s, currentProgress: updated, progress, status };
      });

      // update overall match score based on new stages
      return next;
    });
  };

  const applyPlan = (plan: StagePlanItem[]) => {
    setStages(prev => {
      const nextStages = prev.map(stage => {
        const planItem = plan.find(p => p.stageId === stage.id);
        const next = calculateStageProgress(stage, planItem);
        return {
          ...stage,
          progress: next.progress,
          status: next.status,
          currentProgress: next.currentProgress,
        };
      });

      setUser(u => ({
        ...u,
        hasSetup: true,
      }));

      setDailyTasks(buildDailyTasksFromPlan(plan));
      setDailyTaskOverrides({});
      setApplications(prev => prev.map((app, index) => {
        const stage1 = nextStages[0]?.progress ?? 0;
        const stage2 = nextStages[1]?.progress ?? 0;
        const stage3 = nextStages[2]?.progress ?? 0;
        const stage4 = nextStages[3]?.progress ?? 0;

        if (index === 0 && stage1 >= 100) return { ...app, status: 'interview', stage: 2, waitDays: 1 };
        if (index === 1 && stage2 >= 60) return { ...app, status: 'viewed', stage: 2, waitDays: 2 };
        if (index === 2 && stage3 >= 70) return { ...app, status: 'offer', stage: 3, waitDays: 0 };
        if (index === 3 && stage4 >= 80) return { ...app, status: 'offer', stage: 4, waitDays: 0 };
        return app;
      }));
      setResumeEntries(prev => prev.map(entry => ({
        ...entry,
        stage: nextStages.find(stage => stage.id === entry.stage)?.progress ? entry.stage : entry.stage,
        period: nextStages[entry.stage - 1]?.status === 'completed' ? '已沉淀' : entry.period,
      })));

      return nextStages;
    });
  };
  const seedResumeLibrary = (input: { fileName: string; materials: ResumeMaterial[]; resumeText: string; targetJob: string; targetCompany: string; }) => {
    const seedEntry = buildSeedResumeEntry(input);
    const nextMaterials = input.materials.length > 0
      ? input.materials
      : normalizeResumeText(input.resumeText).map(detail => ({
          title: buildResumeCardTitle(detail, 0),
          detail,
          skills: buildResumeSkills(detail),
        }));

    setResumeMaterials(nextMaterials);
    setResumeEntries([seedEntry]);
  };

  const generateResumeVersion = () => {
    if (resumeMaterials.length === 0) return null;

    const baseEntry = resumeEntries.find(entry => entry.isDefault) ?? resumeEntries[0] ?? null;
    if (!baseEntry) return null;

    const existingVersions = resumeEntries.map(entry => {
      const parsedVersion = Number(entry.id.replace(/^v/, ''));
      return entry.version ?? (Number.isFinite(parsedVersion) ? parsedVersion : 1);
    });
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 2;

    const newEntry = buildResumeVersionFromMaterials(baseEntry, resumeMaterials, nextVersion);
    setResumeEntries(prev => [...prev, newEntry]);
    return newEntry.id;
  };

  const setDefaultResumeVersion = (entryId: string) => {
    setResumeEntries(prev => prev.map(e => ({ ...e, isDefault: e.id === entryId })));
  };

  const value: AppContextType = {
    user,
    stages,
    dailyTasks,
    dailyTaskOverrides,
    applications,
    interviewRecords,
    questions,
    resumeMaterials,
    resumeEntries,
    achievements,
    xiaoYunMessage,
    showXiaoYun,
    completeTask,
    setHasSetup,
    setXiaoYunMessage,
    setShowXiaoYun,
    addApplication,
    updateApplicationStatus,
    editApplication,
    toggleQuestion,
    updateUser,
    updateStageProgress,
    initializeJourney,
    applyPlan,
    seedResumeLibrary,
    generateResumeVersion,
    setDefaultResumeVersion,
    savedAccounts,
    loadAccount,
    resetCurrentAccount,
    exportCurrentAccount,
    updateDailyTaskOverride,
    updateResumeMaterial,
    addResumeMaterial,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
