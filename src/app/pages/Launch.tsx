import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, Reorder } from 'motion/react';
// mammoth will be loaded lazily when user uploads a .docx to keep bundle small
import {
  Rocket, Upload, Target,
  Sparkles, CheckCircle2, AlertCircle, Loader2,
  TrendingUp, Lightbulb, ArrowRight, Pencil,
  Trash2, Plus, GripVertical, X, Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { StagePlanItem } from '../context/AppContext';
import { analyzeCareerPathWithAI, extractResumeMaterialsWithAI } from '../services/ai';
import type { AiDimension, ResumeMaterial } from '../services/ai';

const SAMPLE_JD = `岗位：产品经理实习生
公司：某互联网大厂

岗位职责：
1. 负责C端产品功能的需求分析与产品设计
2. 参与用户调研，挖掘用户痛点，制定产品方案
3. 编写PRD文档，与研发/设计团队协作推进
4. 关注核心数据指标，通过数据驱动产品迭代

任职要求：
1. 大三/大四/研一/研二在校学生，可实习3个月以上
2. 有相关产品/运营实习经验优先
3. 具备基本的数据分析能力（SQL/Excel）
4. 逻辑清晰，沟通表达能力强
5. 对互联网产品有热情和深度思考`;

type Step = 'jd' | 'resume' | 'analyzing' | 'result' | 'plan';

// Default plan targets AI suggests — user can edit before starting
const DEFAULT_PLAN: StagePlanItem[] = [
  {
    stageId: 1,
    duration: '4',
    targets: [
      { label: '投递目标', value: 5, unit: '家' },
      { label: '面试复盘', value: 1, unit: '次' },
    ],
  },
  {
    stageId: 2,
    duration: '6',
    targets: [
      { label: '简历更新', value: 2, unit: '条经历' },
      { label: '投递目标', value: 5, unit: '家' },
    ],
  },
  {
    stageId: 3,
    duration: '8',
    targets: [
      { label: '实习经历', value: 1, unit: '段进阶' },
      { label: '投递目标', value: 8, unit: '家' },
    ],
  },
  {
    stageId: 4,
    duration: '4',
    targets: [
      { label: '秋招投递', value: 20, unit: '家' },
      { label: '目标Offer', value: 1, unit: '个' },
    ],
  },
];

const STAGE_META = [
  { id: 1, name: '起步青云', subtitle: '入门实习，补空白、建节奏', color: '#12B898', icon: '✓', tag: '阶段一' },
  { id: 2, name: '直上青云', subtitle: '进阶实习，练能力、贴目标', color: '#2AC59D', icon: '⬆', tag: '阶段二' },
  { id: 3, name: '平步青云', subtitle: '冲刺实习，高含金量、冲秋招', color: '#70DAAA', icon: '⚡', tag: '阶段三' },
  { id: 4, name: '青云上岸', subtitle: '秋招正式投递，平步青云', color: '#F59E0B', icon: '🏆', tag: '终局' },
];

type WordCloudItem = { word: string; size: number; matched: boolean };

// Word cloud data: [keyword, size (1-3), isMatched]
const DEFAULT_WORD_CLOUD_ITEMS: WordCloudItem[] = [
  { word: '用户调研', size: 3, matched: true },
  { word: '产品设计', size: 3, matched: true },
  { word: '数据分析', size: 2, matched: true },
  { word: '跨部门协作', size: 2, matched: true },
  { word: 'PRD文档', size: 2, matched: true },
  { word: '逻辑思维', size: 2, matched: false },
  { word: 'SQL', size: 1, matched: false },
  { word: '需求分析', size: 2, matched: true },
  { word: 'C端产品', size: 2, matched: false },
  { word: '竞品分析', size: 1, matched: false },
  { word: 'Excel', size: 1, matched: false },
  { word: '用户增长', size: 1, matched: false },
];

function buildWordCloudItems(dimensions: AiDimension[], suggestions: Suggestion[]): WordCloudItem[] {
  const items: WordCloudItem[] = [];

  dimensions.forEach((dimension, di) => {
    dimension.items.forEach((item, ii) => {
      items.push({
        word: item.name,
        size: item.level === '优' ? 3 : item.level === '良' ? 2 : 1,
        matched: item.level === '优' || item.level === '良',
      });
    });
  });

  suggestions.forEach((suggestion, index) => {
    items.push({
      word: suggestion.item,
      size: suggestion.priority === '优先' ? 2 : suggestion.priority === '建议' ? 2 : 1,
      matched: suggestion.priority !== '优先',
    });
  });

  const unique = new Map<string, WordCloudItem>();
  items.forEach(item => {
    if (!unique.has(item.word)) unique.set(item.word, item);
  });

  const result = Array.from(unique.values())
    .sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return b.size - a.size;
    })
    .slice(0, 12);
  return result.length > 0 ? result : DEFAULT_WORD_CLOUD_ITEMS;
}

const DEFAULT_DIMENSION_DATA: AiDimension[] = [
  {
    label: '能力维度',
    icon: '💡',
    items: [
      { name: '软技能', level: '优', desc: '沟通表达、跨团队协作突出' },
      { name: '硬技能', level: '良', desc: '产品设计能力较强，数据工具待补' },
    ],
  },
  {
    label: '经历维度',
    icon: '📋',
    items: [
      { name: '垂直对口度', level: '良', desc: '有产品/运营方向实习经历' },
      { name: '项目丰富度', level: '中', desc: '项目数量适中，场景可进一步拓展' },
    ],
  },
  {
    label: '成长潜力',
    icon: '🌱',
    items: [
      { name: '学习能力', level: '优', desc: '知识迁移速度快，适应新领域' },
      { name: '成长空间', level: '优', desc: '与目标岗位契合度高，提升路径清晰' },
    ],
  },
];

const LEVEL_CONFIG = {
  优: { color: '#12B898', bg: 'rgba(18,184,152,0.12)', border: 'rgba(18,184,152,0.3)' },
  良: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  中: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  待提升: { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
};

type SuggestionPriority = '优先' | '建议' | '拓展';

interface Suggestion {
  id: string;
  item: string;
  priority: SuggestionPriority;
  detail: string;
  isEditing?: boolean;
  editValue?: string;
}

const PRIORITY_CONFIG: Record<SuggestionPriority, { color: string; bg: string; border: string; desc: string }> = {
  优先: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', desc: '当前最值得优先补充' },
  建议: { color: '#F59E0B', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', desc: '可逐步补充，常规成长项' },
  拓展: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.2)', desc: '更高阶能力，长期竞争优势' },
};

const INITIAL_SUGGESTIONS: Suggestion[] = [
  { id: 's1', item: 'SQL数据查询基础', priority: '优先', detail: '可通过牛客网/B站30天入门课补充' },
  { id: 's2', item: 'C端产品实习经验', priority: '优先', detail: '起步青云阶段首要目标' },
  { id: 's3', item: '量化产品数据案例', priority: '建议', detail: '在实习中主动要求参与数据复盘' },
  { id: 's4', item: 'AI产品能力了解', priority: '拓展', detail: '关注AI工具在产品中的应用场景' },
  { id: 's5', item: '用户增长策略', priority: '拓展', detail: '了解增长黑客方法论，提升竞争优势' },
];

const DEFAULT_ENCOURAGEMENT = '你已经具备初步的产品经理能力基础，经历与目标岗位已形成一定匹配度。继续补充项目实践后，将更具岗位竞争力 ✨';

const ANALYZE_CHECKS = ['解析岗位核心要求', '识别简历优势能力', '生成能力匹配画像', '规划个性化成长路径'];

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractWordResumeText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.doc') || file.type === 'application/msword') {
    throw new Error('当前仅支持 .docx 格式的 Word 简历，请先另存为 .docx 后再上传。');
  }

  // lazy-load mammoth to reduce initial bundle size
  let mammoth: any;
  try {
    mammoth = await import('mammoth/mammoth.browser');
  } catch (e) {
    throw new Error('无法加载文档解析器（mammoth），请稍后重试或粘贴简历文本。');
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

function AnalyzingAnimation({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="py-16 flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: '#12B898',
            borderRightColor: '#2AC59D',
            animation: 'spin-slow 1.5s linear infinite',
          }} />
        <div className="absolute inset-3 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}>
          <Sparkles size={28} color="white" />
        </div>
      </div>

      <div className="text-center">
        <div className="font-semibold text-gray-800 mb-1">AI正在整理你的信息...</div>
        <div className="text-sm text-gray-500">正在综合简历、岗位与画像，稍后会直接给出结果</div>
      </div>

      <div className="space-y-2 w-full max-w-xs">
        {ANALYZE_CHECKS.map((step, i) => {
          const active = i === activeIndex;
          return (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 + 0.25, type: 'spring', stiffness: 300, damping: 28 }}
            className="flex items-center gap-2.5 text-sm"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{
                  background: active ? '#12B898' : 'rgba(156,163,175,0.28)',
                  boxShadow: active ? '0 0 0 4px rgba(18,184,152,0.14)' : 'none',
                }}
                animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={active ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : { duration: 0 }}
              />
            </div>
            <span className={active ? 'text-gray-700' : 'text-gray-400'}>{step}</span>
          </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function WordCloudViz({ items }: { items: WordCloudItem[] }) {
  return (
    <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0D9B7E, #12B898, #2AC59D)' }}>
      {/* Decorative background circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10" style={{ background: 'white' }} />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10" style={{ background: 'white' }} />

      <div className="relative">
        <div className="text-white/90 text-xs mb-1">AI识别到的优势能力</div>
        <div className="text-white mb-1">你的能力画像</div>
        <div className="text-white/70 text-xs mb-4">以下能力与你目标岗位高度相关</div>

        {/* Word cloud */}
        <div className="min-h-36 mb-3 flex flex-wrap items-center justify-center gap-2.5">
          {items.map((item, i) => {
            const fontSizes = ['text-xs', 'text-sm', 'text-base'];
            const fontSize = fontSizes[item.size - 1];
            return (
              <motion.div
                key={item.word}
                className={`px-3 py-1 rounded-full ${fontSize} font-medium text-center`}
                style={{
                  background: item.matched
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.1)',
                  color: item.matched ? 'white' : 'rgba(255,255,255,0.55)',
                  border: item.matched
                    ? '1px solid rgba(255,255,255,0.4)'
                    : '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(4px)',
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 + 0.3, type: 'spring', stiffness: 300, damping: 25 }}
              >
                {item.word}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
            <span>已匹配能力</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
            <span>待拓展能力</span>
          </div>
        </div>

        <div className="mt-3 text-white/80 text-xs">
          你已经具备该岗位的部分核心能力 ✨
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onEdit,
  onDelete,
  onSaveEdit,
}: {
  suggestion: Suggestion;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(suggestion.item);
  const cfg = PRIORITY_CONFIG[suggestion.priority];

  return (
    <Reorder.Item value={suggestion} id={suggestion.id}>
      <motion.div
        layout
        className="flex items-start gap-3 p-3 rounded-xl group relative"
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
        }}
        whileHover={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing opacity-30 group-hover:opacity-60 transition-opacity">
          <GripVertical size={14} color="#9CA3AF" />
        </div>

        {/* Priority tag */}
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {suggestion.priority}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {suggestion.isEditing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={localValue}
                onChange={e => setLocalValue(e.target.value)}
                className="flex-1 text-sm px-2 py-0.5 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: `1px solid ${cfg.color}66`,
                  color: '#374151',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveEdit(suggestion.id, localValue);
                  if (e.key === 'Escape') onSaveEdit(suggestion.id, suggestion.item);
                }}
              />
              <button onClick={() => onSaveEdit(suggestion.id, localValue)}>
                <Check size={14} style={{ color: '#12B898' }} />
              </button>
              <button onClick={() => onSaveEdit(suggestion.id, suggestion.item)}>
                <X size={13} style={{ color: '#9CA3AF' }} />
              </button>
            </div>
          ) : (
            <div className="text-sm font-medium text-gray-700">{suggestion.item}</div>
          )}
          {!suggestion.isEditing && (
            <div className="text-xs text-gray-400 mt-0.5">{suggestion.detail}</div>
          )}
        </div>

        {/* Actions */}
        {!suggestion.isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(suggestion.id)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: '#9CA3AF' }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(suggestion.id)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: '#CBD5E1' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </motion.div>
    </Reorder.Item>
  );
}

// Inline editable number input with stepper
function EditableNumber({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= min) onChange(n);
    else setDraft(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); } }}
        className="w-12 text-center text-sm font-bold rounded-lg outline-none"
        style={{
          background: 'rgba(18,184,152,0.08)',
          border: '1.5px solid rgba(18,184,152,0.4)',
          color: '#12B898',
          caretColor: '#12B898',
        }}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="group flex items-center gap-0.5 px-2 py-0.5 rounded-lg transition-all"
      style={{ background: 'rgba(18,184,152,0.07)', border: '1px dashed rgba(18,184,152,0.3)' }}
      title="点击编辑"
    >
      <span className="text-sm font-bold" style={{ color: '#12B898' }}>{value}</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity ml-0.5" style={{ color: '#12B898' }} />
    </button>
  );
}

function PlanStep({
  plan,
  setPlan,
  onConfirm,
}: {
  plan: StagePlanItem[];
  setPlan: React.Dispatch<React.SetStateAction<StagePlanItem[]>>;
  onConfirm: () => void;
}) {
  const updateTarget = (stageIdx: number, targetIdx: number, val: number) => {
    setPlan(prev => prev.map((p, si) => {
      if (si !== stageIdx) return p;
      return {
        ...p,
        targets: p.targets.map((t, ti) => ti === targetIdx ? { ...t, value: val } : t),
      };
    }));
  };

  const updateDuration = (stageIdx: number, val: number) => {
    setPlan(prev => prev.map((p, si) => si === stageIdx ? { ...p, duration: String(Math.max(1, val)) } : p));
  };

  return (
    <motion.div
      key="plan"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      {/* Header banner */}
      <div className="rounded-2xl p-5 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}>
        <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="relative">
          <div className="text-white/80 text-xs mb-0.5">AI已生成你的专属规划</div>
          <div className="text-white font-semibold mb-1">定制你的青云计划</div>
          <p className="text-white/70 text-xs leading-relaxed">
            以下是AI根据你的能力画像生成的四阶段计划。<br />
            点击数字可直接修改，调整成你最舒适的节奏 ✨
          </p>
        </div>
      </div>

      {/* Stage plan cards */}
      <div className="space-y-3 mb-5">
        {STAGE_META.map((meta, si) => {
          const planItem = plan[si];
          return (
            <motion.div
              key={meta.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.07, type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-card rounded-2xl p-4"
              style={{ border: `1px solid ${meta.color}22` }}
            >
              {/* Stage header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${meta.color}18`, border: `1.5px solid ${meta.color}33` }}>
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: `${meta.color}15`, color: meta.color }}>
                      {meta.tag}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-800 text-sm">{meta.name}</div>
                  <div className="text-xs text-gray-400">{meta.subtitle}</div>
                </div>
                {/* Duration */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="text-[10px] text-gray-400 mb-0.5">计划时长</div>
                  <div className="flex items-center gap-1">
                    <EditableNumber
                      value={Number(planItem.duration)}
                      onChange={v => updateDuration(si, v)}
                      min={1}
                    />
                    <span className="text-xs text-gray-400">周</span>
                  </div>
                </div>
              </div>

              {/* Targets grid */}
              <div className="grid grid-cols-2 gap-2">
                {planItem.targets.map((t, ti) => (
                  <div key={ti}
                    className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: 'rgba(248,250,252,0.9)' }}>
                    <span className="text-xs text-gray-500">{t.label}</span>
                    <div className="flex items-center gap-1">
                      <EditableNumber
                        value={t.value}
                        onChange={v => updateTarget(si, ti, v)}
                      />
                      <span className="text-xs text-gray-400">{t.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="glass-card rounded-xl p-3 mb-5 flex items-start gap-2">
        <span className="text-base flex-shrink-0">☁️</span>
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-medium" style={{ color: '#12B898' }}>小云提示：</span>
          这个计划会在青云路径中同步显示。你随时可以在主页中继续调整——成长本来就是动态的！
        </p>
      </div>

      <motion.button
        onClick={onConfirm}
        className="w-full py-3.5 rounded-2xl text-white font-medium flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #12B898, #2AC59D)',
          boxShadow: '0 4px 16px rgba(18,184,152,0.3)',
        }}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Rocket size={16} /> 开始我的青云之旅！
      </motion.button>
    </motion.div>
  );
}

export function Launch() {
  const navigate = useNavigate();
  const { user, setHasSetup, setXiaoYunMessage, applyPlan, seedResumeLibrary, updateUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<Step>('jd');
  const [jdText, setJdText] = useState('');
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [extractingWord, setExtractingWord] = useState(false);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const pasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [aiEncouragement, setAiEncouragement] = useState(DEFAULT_ENCOURAGEMENT);
  const [growthDimensions, setGrowthDimensions] = useState<AiDimension[]>(DEFAULT_DIMENSION_DATA);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS);
  const [showAddSuggestion, setShowAddSuggestion] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [plan, setPlan] = useState<StagePlanItem[]>(DEFAULT_PLAN);
  const [rawAiResponse, setRawAiResponse] = useState('');
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [wordCloudItems, setWordCloudItems] = useState<WordCloudItem[]>(DEFAULT_WORD_CLOUD_ITEMS);
  const [analysisPulseIndex, setAnalysisPulseIndex] = useState(0);
  const [resumeMaterials, setResumeMaterials] = useState<ResumeMaterial[]>([]);

  const handleCancelAnalysis = () => {
    analysisAbortRef.current?.abort();
  };

  const handleAnalyze = async () => {
    setAnalysisError('');

    if (!resumeUploaded && !resumeText.trim()) {
      setAnalysisError('请先上传简历文件或粘贴简历文本后再开始分析。');
      return;
    }

    setStep('analyzing');
    setAnalysisPulseIndex(0);

    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    let progressTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
      setAnalysisPulseIndex(prev => (prev + 1) % ANALYZE_CHECKS.length);
    }, 1100);

    try {
      const [aiResult, extractionResult] = await Promise.all([
        analyzeCareerPathWithAI({
          jdText,
          resumeText,
          targetJob: user.targetJob,
          targetCompany: user.targetCompany,
        }, { signal: controller.signal }),
        extractResumeMaterialsWithAI({
          resumeText,
          targetJob: user.targetJob,
          targetCompany: user.targetCompany,
        }, { signal: controller.signal }),
      ]);

      setResumeMaterials(extractionResult.materials);

      setAiEncouragement(aiResult.encouragement);
      updateUser({ matchScore: aiResult.matchScore });
      setGrowthDimensions(aiResult.dimensions);
      setWordCloudItems(buildWordCloudItems(aiResult.dimensions, aiResult.suggestions));
      setRawAiResponse(aiResult.raw ?? '');
      setSuggestions(
        aiResult.suggestions.map((item, index) => ({
          id: `s${Date.now()}_${index}`,
          item: item.item,
          priority: item.priority,
          detail: item.detail,
        }))
      );
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      await wait(320);

      setStep('result');
      setShowResult(true);
      setXiaoYunMessage('能力画像已生成！你已经具备了不少核心能力，继续加油 🚀');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setAnalysisError('已取消分析，可以重新开始。');
      } else {
        const message = error instanceof Error ? error.message : 'AI 分析失败，请稍后重试。';
        setAnalysisError(message);
      }
      const message = error instanceof Error ? error.message : 'AI 分析失败，请稍后重试。';
      setStep('resume');
      setAnalysisPulseIndex(0);
    } finally {
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
      }
      if (progressTimer) clearInterval(progressTimer);
    }
  };

  const handleStartJourney = () => {
    seedResumeLibrary({
      fileName: resumeFileName,
      materials: resumeMaterials,
      resumeText: resumeText.trim(),
      targetJob: user.targetJob,
      targetCompany: user.targetCompany,
    });
    applyPlan(plan);
    setHasSetup(true);
    navigate('/', { replace: true });
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    lastFileRef.current = file;
    setResumeFileName(file.name);
    setResumeUploaded(true);

    // Try to extract text from plain text / markdown files
    if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      try {
        const text = await file.text();
        setResumeText(text);
      } catch (err) {
        console.warn('Failed to read file text:', err);
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      setExtractingWord(true);
      setShowPasteFallback(false);
      setAnalysisError('');
      try {
        const text = await extractWordResumeText(file);
        setResumeText(text);
      } catch (err) {
        console.warn('Failed to extract Word resume text:', err);
        setAnalysisError(err instanceof Error ? err.message : 'Word 简历解析失败，请改为 .docx 后重试。');
        setShowPasteFallback(true);
      } finally {
        setExtractingWord(false);
      }
    } else if (file.type === 'application/pdf') {
      // For PDF, we cannot extract text in browser without a library
      // Just show a note asking the user to paste the content manually
      setResumeText('');
    } else if (file.type === 'application/msword' || file.name.endsWith('.doc')) {
      setResumeText('');
      setAnalysisError('当前仅支持 .docx 格式的 Word 简历，请先另存为 .docx 后再上传。');
    }
  };

  const handleRetryExtract = async () => {
    const file = lastFileRef.current;
    if (!file) {
      setAnalysisError('没有可重试的文件，请重新上传。');
      return;
    }
    setExtractingWord(true);
    setAnalysisError('');
    try {
      const text = await extractWordResumeText(file);
      setResumeText(text);
      setShowPasteFallback(false);
    } catch (err) {
      console.warn('Retry failed:', err);
      setAnalysisError(err instanceof Error ? err.message : '重试解析失败，请粘贴简历文本或另存为 .docx 再试。');
      setShowPasteFallback(true);
    } finally {
      setExtractingWord(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileChange(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      await handleFileChange(files[0]);
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleResumeReset = () => {
    setResumeUploaded(false);
    setResumeFileName('');
    setResumeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (id: string) => {
    setSuggestions(prev => prev.map(s => ({ ...s, isEditing: s.id === id })));
  };

  const handleSaveEdit = (id: string, value: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, item: value, isEditing: false } : s
    ));
  };

  const handleDelete = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSuggestion = () => {
    if (!newSuggestion.trim()) return;
    setSuggestions(prev => [...prev, {
      id: `s${Date.now()}`,
      item: newSuggestion.trim(),
      priority: '建议',
      detail: '自定义成长目标',
    }]);
    setNewSuggestion('');
    setShowAddSuggestion(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}>
            <Rocket size={16} color="white" />
          </div>
          <h1 className="text-gray-800">青云启航</h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">AI职业成长助手 · 能力画像生成</p>
      </motion.div>

      {/* Step indicator */}
      {step !== 'analyzing' && step !== 'result' && step !== 'plan' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-6"
        >
          {[
            { key: 'jd', label: '输入JD', num: 1 },
            { key: 'resume', label: '上传简历', num: 2 },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isDone = (step === 'resume' && s.key === 'jd');
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isDone
                        ? 'rgba(18,184,152,0.15)'
                        : isActive
                          ? 'linear-gradient(135deg, #12B898, #2AC59D)'
                          : 'rgba(226,232,240,0.6)',
                      color: isDone ? '#12B898' : isActive ? 'white' : '#9CA3AF',
                    }}
                  >
                    {isDone ? <CheckCircle2 size={14} /> : s.num}
                  </div>
                  <span className="text-sm" style={{ color: isActive ? '#12B898' : '#9CA3AF' }}>
                    {s.label}
                  </span>
                </div>
                {i < 1 && (
                  <div className="w-8 h-px" style={{ background: 'rgba(226,232,240,0.8)' }} />
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: JD Input */}
        {step === 'jd' && (
          <motion.div
            key="jd"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          >
            <div className="glass-card rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} style={{ color: '#12B898' }} />
                <h2 className="text-gray-800 text-sm font-semibold">粘贴目标岗位JD</h2>
              </div>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                className="w-full h-52 text-sm resize-none rounded-xl p-3 outline-none transition-all"
                style={{
                  background: 'rgba(247,255,252,0.8)',
                  border: '1px solid rgba(18,184,152,0.2)',
                  color: '#374151',
                }}
                placeholder="粘贴你心仪的实习/秋招JD内容..."
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                  <Lightbulb size={11} />
                  建议粘贴完整JD，包含岗位职责和任职要求
                </div>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{jdText.length}/2000字</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} style={{ color: '#12B898' }} />
                <span className="text-sm font-medium text-gray-700">目标信息</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '目标岗位', value: user.targetJob },
                  { label: '目标公司', value: user.targetCompany },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <input
                      className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                      style={{
                        background: 'rgba(247,255,252,0.8)',
                        border: '1px solid rgba(18,184,152,0.2)',
                        color: '#374151',
                      }}
                      defaultValue={item.value}
                    />
                  </div>
                ))}
              </div>
            </div>

            <motion.button
              onClick={() => jdText.trim() && setStep('resume')}
              className="w-full py-3.5 rounded-2xl text-white font-medium flex items-center justify-center gap-2"
              style={{
                background: jdText.trim()
                  ? 'linear-gradient(135deg, #12B898, #2AC59D)'
                  : 'rgba(226,232,240,0.6)',
                color: jdText.trim() ? 'white' : '#9CA3AF',
                boxShadow: jdText.trim() ? '0 4px 16px rgba(18,184,152,0.3)' : 'none',
              }}
              whileHover={jdText.trim() ? { y: -1 } : {}}
              whileTap={jdText.trim() ? { scale: 0.98 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              下一步：上传简历 <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Resume Upload */}
        {step === 'resume' && (
          <motion.div
            key="resume"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          >
            <div
              className="glass-card rounded-2xl p-8 mb-4 text-center transition-all"
              style={{
                border: isDragging
                  ? '2px dashed #12B898'
                  : resumeUploaded
                    ? '2px solid rgba(18,184,152,0.4)'
                    : '2px dashed rgba(226,232,240,0.8)',
                background: isDragging ? 'rgba(18,184,152,0.04)' : undefined,
              }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {resumeUploaded ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(18,184,152,0.1)' }}>
                    <CheckCircle2 size={32} style={{ color: '#12B898' }} />
                  </div>
                  <div className="font-semibold text-gray-800">简历已上传</div>
                  <div className="text-sm text-gray-500 mt-1">{resumeFileName || '已上传'}</div>
                  <button
                    onClick={handleResumeReset}
                    className="mt-2 text-xs" style={{ color: '#12B898' }}>
                    重新上传
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(18,184,152,0.08)' }}>
                    <Upload size={28} style={{ color: '#12B898' }} />
                  </div>
                  <div className="font-medium text-gray-700 mb-1">拖拽简历到此处</div>
                  <div className="text-sm text-gray-400 mb-4">支持 PDF / Word(.docx) / TXT 格式</div>
                  <button
                    onClick={handleSelectFileClick}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(18,184,152,0.1)', color: '#12B898' }}
                  >
                    选择文件
                  </button>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </div>

            <div className="glass-card rounded-xl p-3.5 mb-5 flex items-start gap-2.5">
              <AlertCircle size={14} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs text-gray-500">
                分析会调用你在环境变量中配置的 AI 服务接口。TXT/MD 和 Word(.docx) 会自动提取内容，PDF 需要手动复制粘贴。请不要上传敏感隐私信息。
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">简历内容{resumeFileName ? '（已从文件提取或可手动补充）' : '（必填或从上传文件提取）'}</div>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                ref={el => { pasteTextareaRef.current = el; }}
                className="w-full h-32 text-sm resize-none rounded-xl p-3 outline-none transition-all"
                style={{
                  background: 'rgba(247,255,252,0.8)',
                  border: '1px solid rgba(18,184,152,0.2)',
                  color: '#374151',
                }}
                placeholder="粘贴简历经历、项目、技能关键词或核心成就"
              />
            </div>

            {analysisError && (
              <div className="glass-card rounded-xl p-3 mb-4 flex items-start gap-2.5"
                style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' }}>
                <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: '#B91C1C' }}>{analysisError}</p>
              </div>
            )}

            {extractingWord && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Loader2 size={12} className="animate-spin" /> 正在解析 Word 文档，请稍候…
              </div>
            )}

            {showPasteFallback && (
              <div className="flex items-center gap-2 text-xs mb-4">
                <button
                  onClick={() => { setStep('resume'); setTimeout(() => pasteTextareaRef.current?.focus(), 120); }}
                  className="px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(18,184,152,0.08)', color: '#12B898' }}
                >粘贴/手动编辑简历</button>
                <button
                  onClick={handleRetryExtract}
                  className="px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6' }}
                >重试解析</button>
                <div className="text-gray-400">解析失败时可选择粘贴或重试；PDF 请复制粘贴内容。</div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('jd')}
                className="px-6 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'rgba(226,232,240,0.6)', color: '#6B7280' }}
              >
                上一步
              </button>
              <motion.button
                onClick={handleAnalyze}
                disabled={extractingWord}
                className="flex-1 py-3 rounded-2xl text-white font-medium flex items-center justify-center gap-2"
                style={{
                  background: extractingWord ? 'rgba(226,232,240,0.9)' : 'linear-gradient(135deg, #12B898, #2AC59D)',
                  boxShadow: extractingWord ? 'none' : '0 4px 16px rgba(18,184,152,0.3)',
                  color: extractingWord ? '#94A3B8' : 'white',
                }}
                whileHover={extractingWord ? {} : { y: -1 }}
                whileTap={extractingWord ? {} : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {extractingWord ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {extractingWord ? '简历解析中…' : '开始AI分析，生成能力画像'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Analyzing */}
        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnalyzingAnimation activeIndex={analysisPulseIndex} />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">正在分析 JD 与简历，可随时取消并返回上一步。</div>
              <button
                onClick={handleCancelAnalysis}
                className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}
              >
                <X size={12} /> 取消分析
              </button>
            </div>
          </motion.div>
        )}

        {/* Result */}
        {step === 'result' && showResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Word Cloud Visualization - replaces match percentage */}
            <WordCloudViz items={wordCloudItems} />

            {/* 3D Growth Analysis */}
            <div className="glass-card rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} style={{ color: '#12B898' }} />
                <h3 className="text-sm font-semibold text-gray-700">三维成长分析</h3>
              </div>

              <div className="space-y-4">
                {growthDimensions.map((dim, di) => (
                  <motion.div
                    key={dim.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: di * 0.1 + 0.3, type: 'spring', stiffness: 300, damping: 28 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{dim.icon}</span>
                      <span className="text-xs font-semibold text-gray-600">{dim.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {dim.items.map(item => {
                        const lvl = item.level as keyof typeof LEVEL_CONFIG;
                        const lvlCfg = LEVEL_CONFIG[lvl];
                        return (
                          <div key={item.name}
                            className="p-2.5 rounded-xl"
                            style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.6)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">{item.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: lvlCfg.bg, color: lvlCfg.color, border: `1px solid ${lvlCfg.border}` }}>
                                {item.level}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">{item.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* AI Encouragement */}
              <div className="mt-4 p-3 rounded-xl"
                style={{ background: 'rgba(18,184,152,0.06)', border: '1px solid rgba(18,184,152,0.15)' }}>
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">☁️</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#12B898' }}>
                    <span className="font-medium">小云说：</span>{aiEncouragement}
                  </p>
                </div>
              </div>
            </div>

            {/* Growth Suggestions (editable + reorderable) */}
            <div className="glass-card rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lightbulb size={15} style={{ color: '#F59E0B' }} />
                  <h3 className="text-sm font-semibold text-gray-700">能力提升方向</h3>
                </div>
                <button
                  onClick={() => setShowAddSuggestion(v => !v)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(18,184,152,0.08)', color: '#12B898' }}
                >
                  <Plus size={12} /> 添加
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">拖动可调整优先级 · 点击铅笔可编辑</p>

              {/* Priority legend */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {(Object.entries(PRIORITY_CONFIG) as [SuggestionPriority, typeof PRIORITY_CONFIG[SuggestionPriority]][]).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1 text-xs">
                    <span className="px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {key}
                    </span>
                    <span className="text-gray-400">{cfg.desc}</span>
                  </div>
                ))}
              </div>

              {/* Add new suggestion input */}
              <AnimatePresence>
                {showAddSuggestion && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newSuggestion}
                        onChange={e => setNewSuggestion(e.target.value)}
                        placeholder="添加自定义成长目标..."
                        className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
                        style={{
                          background: 'rgba(247,255,252,0.8)',
                          border: '1px solid rgba(18,184,152,0.25)',
                          color: '#374151',
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleAddSuggestion()}
                      />
                      <button onClick={handleAddSuggestion}
                        className="px-3 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(18,184,152,0.1)', color: '#12B898' }}>
                        确认
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Reorder.Group axis="y" values={suggestions} onReorder={setSuggestions} className="space-y-2">
                {suggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSaveEdit={handleSaveEdit}
                  />
                ))}
              </Reorder.Group>
            </div>

            {/* Path preview */}
            <div className="glass-card rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} style={{ color: '#12B898' }} />
                <h3 className="text-sm font-semibold text-gray-700">已生成你的青云路径</h3>
              </div>
              <div className="space-y-2">
                {STAGE_META.map((meta, i) => {
                  const item = {
                    stage: meta.name,
                    desc: meta.subtitle,
                    color: meta.color,
                    done: false,
                    active: i === 0,
                  };

                  return (
                  <div key={item.stage} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        background: item.done || item.active ? item.color : 'rgba(226,232,240,0.8)',
                        boxShadow: item.active ? `0 0 0 3px ${item.color}33` : undefined,
                      }} />
                    <div className="flex-1 text-xs">
                      <span className="font-medium text-gray-700">{item.stage}</span>
                      <span className="text-gray-400 ml-1.5">— {item.desc}</span>
                    </div>
                    {item.done && <CheckCircle2 size={12} style={{ color: '#12B898' }} />}
                    {item.active && <span className="text-xs" style={{ color: '#F59E0B' }}>当前</span>}
                  </div>
                  );
                })}
              </div>
            </div>

            <motion.button
              onClick={() => setStep('plan')}
              className="w-full py-3.5 rounded-2xl text-white font-medium flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #12B898, #2AC59D)',
                boxShadow: '0 4px 16px rgba(18,184,152,0.3)',
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <ArrowRight size={16} /> 下一步：制定青云计划
            </motion.button>

            <div className="mt-3 text-center">
              <button
                onClick={() => setShowRawResponse(v => !v)}
                className="text-xs text-gray-500 underline"
              >
                {showRawResponse ? '隐藏原始 AI 响应' : '显示原始 AI 响应（调试）'}
              </button>
            </div>

            {showRawResponse && rawAiResponse && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border text-xs max-h-48 overflow-auto">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rawAiResponse}</pre>
              </div>
            )}
          </motion.div>
        )}

        {/* Plan customization step */}
        {step === 'plan' && (
          <PlanStep plan={plan} setPlan={setPlan} onConfirm={handleStartJourney} />
        )}
      </AnimatePresence>
    </div>
  );
}
