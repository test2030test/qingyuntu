export type AiSuggestionPriority = '优先' | '建议' | '拓展';

export interface AiSuggestion {
  item: string;
  priority: AiSuggestionPriority;
  detail: string;
}

export type AiDimensionLevel = '优' | '良' | '中' | '待提升';

export interface AiDimensionItem {
  name: string;
  level: AiDimensionLevel;
  desc: string;
}

export interface AiDimension {
  label: string;
  icon: string;
  items: AiDimensionItem[];
}

export interface AiLaunchAnalysis {
  encouragement: string;
  suggestions: AiSuggestion[];
  dimensions: AiDimension[];
  matchScore: number;
  raw?: string;
}

export interface ResumeMaterial {
  title: string;
  position?: string;
  detail: string;
  skills: string[];
  startDate?: string;
  endDate?: string;
  date?: string;
}

export interface ResumeMaterialExtraction {
  materials: ResumeMaterial[];
  raw?: string;
}

interface AnalyzeInput {
  jdText: string;
  resumeText: string;
  targetJob: string;
  targetCompany: string;
}

interface ResumeMaterialInput {
  resumeText: string;
  targetJob: string;
  targetCompany: string;
}

interface RequestOptions {
  signal?: AbortSignal;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function formatApiError(status: number, message: string, response: Response): string {
  if (status === 403) {
    return 'AI 请求失败（403）：当前密钥没有访问这个模型或接口的权限，或者模型还没有在账号里开通。请检查 DashScope 控制台里的模型授权、Key 状态，以及 VITE_AI_MODEL 是否可用。';
  }

  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const retryHint = retryAfter ? `建议等待 ${retryAfter} 秒后再试。` : '建议稍后再试。';
    return `AI 请求失败（429）：当前请求过于频繁或配额已达上限。${retryHint}`;
  }

  if (status === 400 && /Not supported model/i.test(message)) {
    return `AI 模型不被当前接口支持：${message}。请把 VITE_AI_MODEL 改成服务商支持的模型名。`;
  }

  return `AI 请求失败（${status}）：${message}`;
}

const DIMENSION_LABELS: AiDimension['label'][] = ['能力维度', '经历维度', '成长维度'];

function normalizeLevel(level: string): AiDimensionLevel {
  if (level === '优' || level === '良' || level === '中' || level === '待提升') {
    return level;
  }

  if (level.includes('优') || level.includes('强')) return '优';
  if (level.includes('良') || level.includes('较')) return '良';
  if (level.includes('中') || level.includes('基础')) return '中';
  return '待提升';
}

function normalizePriority(priority: string): AiSuggestionPriority {
  if (priority === '优先' || priority === '建议' || priority === '拓展') {
    return priority;
  }

  if (priority.includes('高') || priority.includes('优')) return '优先';
  if (priority.includes('拓')) return '拓展';
  return '建议';
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  // Some models may wrap JSON in prose/code fences; this keeps only the object body.
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI 返回内容不是合法 JSON。建议重试，或切换到更稳定的模型后再分析。');
  }

  return trimmed.slice(start, end + 1);
}

function getEnv(name: string): string {
  const value = (import.meta as any).env?.[name] as string | undefined;
  return value?.trim() ?? '';
}

function buildFallbackDimensions(suggestions: AiSuggestion[]): AiDimension[] {
  const seed = suggestions.length > 0 ? suggestions : [
    { item: '项目实践', priority: '建议' as AiSuggestionPriority, detail: '补充真实项目场景' },
    { item: '数据分析', priority: '建议' as AiSuggestionPriority, detail: '增强结果量化表达' },
    { item: '协作推进', priority: '建议' as AiSuggestionPriority, detail: '强化跨部门沟通' },
  ];

  const pick = (index: number) => seed[index % seed.length];
  const levelFromPriority = (priority: AiSuggestionPriority): AiDimensionLevel => {
    if (priority === '优先') return '待提升';
    if (priority === '建议') return '中';
    return '良';
  };

  return [
    {
      label: '能力维度',
      icon: '💡',
      items: [
        { name: pick(0).item, level: levelFromPriority(pick(0).priority), desc: pick(0).detail },
        { name: pick(1).item, level: levelFromPriority(pick(1).priority), desc: pick(1).detail },
      ],
    },
    {
      label: '经历维度',
      icon: '📋',
      items: [
        { name: '实习经历匹配', level: '良', desc: '正在向目标岗位靠拢' },
        { name: '项目案例沉淀', level: '中', desc: pick(0).detail },
      ],
    },
    {
      label: '成长维度',
      icon: '🌱',
      items: [
        { name: '短板补齐', level: '中', desc: pick(2).detail },
        { name: '长期竞争力', level: '良', desc: '具备持续成长空间' },
      ],
    },
  ];
}

function normalizeMatchScore(value: unknown, dimensions: AiDimension[], suggestions: AiSuggestion[]): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(100, Math.max(0, Math.round(numeric)));
  }

  const levelScore: Record<AiDimensionLevel, number> = {
    优: 92,
    良: 76,
    中: 60,
    待提升: 42,
  };

  const dimensionItems = dimensions.flatMap(dimension => dimension.items);
  const dimensionScore = dimensionItems.length > 0
    ? Math.round(dimensionItems.reduce((sum, item) => sum + levelScore[item.level], 0) / dimensionItems.length)
    : 58;

  const suggestionBonus = Math.min(12, suggestions.filter(item => item.priority !== '优先').length * 3);
  return Math.min(100, Math.max(0, dimensionScore + suggestionBonus));
}

function buildLocalResumeMaterials(resumeText: string): ResumeMaterial[] {
  const lines = resumeText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^(?:[-*•·]|\d+[.、]|[一二三四五六七八九十]+[.、])/.test(line));

  const source = lines.length > 0
    ? lines.slice(0, 6)
    : ['未提取到明确经历，建议补充项目、实习、课程实践或比赛经历。'];

  return source.map((detail, index) => ({
    title: `素材 ${index + 1}`,
    detail,
    skills: detail.includes('项目')
      ? ['项目复盘']
      : detail.includes('用户')
        ? ['用户调研']
        : detail.includes('数据')
          ? ['数据分析']
          : ['简历优化'],
  }));
}

export async function analyzeCareerPathWithAI(input: AnalyzeInput, options: RequestOptions = {}): Promise<AiLaunchAnalysis> {
  const apiKey = getEnv('VITE_AI_API_KEY');
  const model = getEnv('VITE_AI_MODEL');
  const baseUrl = getEnv('VITE_AI_BASE_URL');

  if (!apiKey || !model || !baseUrl) {
    throw new Error('未配置 AI 环境变量。请在 .env.local 中设置 VITE_AI_API_KEY、VITE_AI_MODEL、VITE_AI_BASE_URL。');
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const systemPrompt = [
    '你是一个职业规划助手，专注实习/秋招产品经理方向。',
    '你必须仅输出 JSON，不要输出任何额外文字。',
    'JSON 格式如下：',
    '{',
    '  "encouragement": "string",',
    '  "matchScore": 0,',
    '  "dimensions": [',
    '    { "label": "string", "icon": "string", "items": [ { "name": "string", "level": "优|良|中|待提升", "desc": "string" } ] }',
    '  ],',
    '  "suggestions": [',
    '    { "item": "string", "priority": "优先|建议|拓展", "detail": "string" }',
    '  ]',
    '}',
    'dimensions 必须包含 3 个维度，每个维度 2 个条目，分别是能力维度、经历维度、成长维度。',
    'suggestions 需要 3-6 条，内容具体且可执行。',
  ].join('\n');

  const userPrompt = [
    `目标岗位：${input.targetJob || '未填写'}`,
    `目标公司：${input.targetCompany || '未填写'}`,
    '【JD】',
    input.jdText || '未提供',
    '【简历内容】',
    input.resumeText || '用户仅上传了文件，未提供可解析文本',
  ].join('\n\n');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: options.signal,
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text.slice(0, 200);

    throw new Error(formatApiError(response.status, message, response));
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('AI 未返回有效内容。');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJsonObject(content));
  } catch {
    throw new Error('AI 返回解析失败，请检查模型输出格式。');
  }

  const encouragement = typeof parsed?.encouragement === 'string'
    ? parsed.encouragement.trim()
    : '';

  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
      .map((item: any) => ({
        item: typeof item?.item === 'string' ? item.item.trim() : '',
        priority: normalizePriority(String(item?.priority ?? '建议')),
        detail: typeof item?.detail === 'string' ? item.detail.trim() : '',
      }))
      .filter((item: AiSuggestion) => item.item)
      .slice(0, 6)
    : [];

  const dimensions = Array.isArray(parsed?.dimensions) && parsed.dimensions.length > 0
    ? parsed.dimensions
      .slice(0, 3)
      .map((dimension: any, index: number) => ({
        label: DIMENSION_LABELS[index] ?? (typeof dimension?.label === 'string' ? dimension.label : '能力维度'),
        icon: typeof dimension?.icon === 'string' ? dimension.icon : ['💡', '📋', '🌱'][index] ?? '✨',
        items: Array.isArray(dimension?.items)
          ? dimension.items.slice(0, 2).map((item: any) => ({
              name: typeof item?.name === 'string' ? item.name.trim() : '未命名能力',
              level: normalizeLevel(String(item?.level ?? '中')),
              desc: typeof item?.desc === 'string' ? item.desc.trim() : '暂无说明',
            }))
          : [],
      }))
      .filter((dimension: AiDimension) => dimension.items.length > 0)
    : buildFallbackDimensions(suggestions);

  const normalizedMatchScore = normalizeMatchScore(parsed?.matchScore, dimensions, suggestions);

  if (!encouragement || suggestions.length === 0) {
    throw new Error('AI 返回内容不完整，请重试；如果一直失败，可改用更大的模型或稍后再试。');
  }

  return {
    encouragement,
    suggestions,
    dimensions: dimensions.length > 0 ? dimensions : buildFallbackDimensions(suggestions),
    matchScore: normalizedMatchScore,
    raw: content,
  };
}

export async function extractResumeMaterialsWithAI(input: ResumeMaterialInput, options: RequestOptions = {}): Promise<ResumeMaterialExtraction> {
  const apiKey = getEnv('VITE_AI_API_KEY');
  const model = getEnv('VITE_AI_MODEL');
  const baseUrl = getEnv('VITE_AI_BASE_URL');

  if (!apiKey || !model || !baseUrl) {
    return { materials: buildLocalResumeMaterials(input.resumeText) };
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const systemPrompt = [
    '你是简历经历素材提取器。',
    '你必须仅输出 JSON，不要输出任何额外文字。',
    '只根据用户提供的简历内容提取经历素材，不要使用目标岗位或目标公司去编造经历。',
    'JSON 格式如下：',
    '{',
    '  "materials": [',
    '    { "title": "string", "detail": "string", "skills": ["string"] }',
    '  ]',
    '}',
    'materials 需要 3-8 条，若内容不足则尽量输出已有真实素材，不要虚构。',
    '每条材料标题要短，detail 要保留经历原意，skills 给出 1-3 个与该条经历相关的技能标签。',
  ].join('\n');

  const userPrompt = [
    `目标岗位：${input.targetJob || '未填写'}`,
    `目标公司：${input.targetCompany || '未填写'}`,
    '【简历内容】',
    input.resumeText || '未提供可解析文本',
  ].join('\n\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: options.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(formatApiError(response.status, text.slice(0, 200), response));
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { materials: buildLocalResumeMaterials(input.resumeText) };
    }

    const parsed = JSON.parse(extractJsonObject(content)) as { materials?: Array<{ title?: string; detail?: string; skills?: unknown }> };
    const materials = Array.isArray(parsed?.materials)
      ? parsed.materials
          .map((item, index) => ({
            title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : `素材 ${index + 1}`,
            detail: typeof item?.detail === 'string' && item.detail.trim() ? item.detail.trim() : '',
            skills: Array.isArray(item?.skills)
              ? item.skills.map(skill => String(skill).trim()).filter(Boolean).slice(0, 3)
              : [],
          }))
          .filter(item => item.detail)
      : [];

    if (materials.length > 0) {
      return { materials: materials.slice(0, 8), raw: content };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    // fall through to local extraction
  }

  return { materials: buildLocalResumeMaterials(input.resumeText) };
}
