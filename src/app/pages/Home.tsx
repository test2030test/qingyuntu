import { useState } from 'react';
import { Link } from 'react-router';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, CheckCircle2, Lock, Flame, Star,
  ChevronRight, Zap, Building2, ArrowUp, Map,
  Target, Calendar, Award, Sparkles, Pencil,
  Download, Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Stage } from '../context/AppContext';

// Inline editable number — click to edit, Enter/blur to save
function InlineNum({
  value,
  onChange,
  color = '#12B898',
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const open = () => { setDraft(String(value)); setEditing(true); };
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) onChange(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-10 text-center rounded-md outline-none"
        style={{
          background: `${color}12`,
          border: `1.5px solid ${color}55`,
          color,
          caretColor: color,
          fontSize: '0.875rem',
          fontWeight: 600,
          lineHeight: '1.5rem',
        }}
      />
    );
  }

  return (
    <button
      onClick={open}
      title="点击编辑"
      className="group inline-flex items-center gap-0.5 rounded px-0.5 transition-all"
      style={{ color }}
    >
      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</span>
      <Pencil size={8} className="opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

function CloudIcon({ size = 24, color = '#12B898' }: { size?: number; color?: string }) {
  const s = size;
  return (
    <svg width={s} height={s * 0.65} viewBox="0 0 36 24" fill="none">
      <ellipse cx="18" cy="18" rx="16" ry="7" fill={color} />
      <ellipse cx="11" cy="13" rx="9" ry="8" fill={color} />
      <ellipse cx="25" cy="12" rx="8" ry="7.5" fill={color} />
      <ellipse cx="18" cy="10" rx="8" ry="7" fill={color} />
    </svg>
  );
}

// Growth stage labels replacing percentages
const GROWTH_STAGES = ['初步建立', '持续成长', '优势形成'];
function getGrowthStage(progress: number): string {
  if (progress >= 70) return '优势形成';
  if (progress >= 35) return '持续成长';
  return '初步建立';
}

function formatJdMatchScore(score: number): string {
  return `JD匹配度 ${Math.max(0, Math.min(100, Math.round(score)))}%`;
}

function GrowthStageBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}>
      {label}
    </span>
  );
}

function StageStatusBadge({ status, progress }: { status: Stage['status']; progress: number }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: 'rgba(18,184,152,0.12)', color: '#12B898' }}>
        <CheckCircle2 size={11} /> 已通关
      </span>
    );
  }
  if (status === 'active') {
    const growthLabel = getGrowthStage(progress);
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium pulse-glow"
        style={{ background: 'rgba(18,184,152,0.15)', color: '#12B898', border: '1px solid rgba(18,184,152,0.3)' }}>
        <Flame size={11} /> {growthLabel}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: 'rgba(148,163,184,0.12)', color: '#94A3B8' }}>
      <Lock size={11} /> 待解锁
    </span>
  );
}

function StageCard({ stage, index, isExpanded, onToggle, onUpdateProgress }: {
  stage: Stage;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateProgress: (progressIndex: number, field: 'value' | 'total', val: number) => void;
}) {
  const isCompleted = stage.status === 'completed';
  const isActive = stage.status === 'active';
  const isLocked = stage.status === 'locked';

  const cardClass = isActive
    ? 'active-stage-card'
    : isCompleted
      ? 'completed-stage-card'
      : 'locked-stage-card';

  const stageIcons = ['✓', '⬆', '⚡', '🏆'];
  const stageColors = ['#12B898', '#2AC59D', '#70DAAA', '#F59E0B'];

  // AI feedback messages
  const aiFeedback = [
    '你的成长轨迹已与目标岗位产生更多关联 ✨',
    '你的成长路径正在逐渐清晰，继续积累实践经验 🌱',
    '积累足够的实践经验后，将逐渐进入更高阶段 ☁️',
    '你的能力结构将形成鲜明的优势方向 🚀',
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.08 }}
      className={`relative rounded-2xl overflow-hidden cursor-pointer ${cardClass}`}
      style={{ boxShadow: isActive ? '0 4px 24px rgba(18,184,152,0.15)' : '0 2px 12px rgba(0,0,0,0.04)' }}
      onClick={onToggle}
      whileHover={{ y: isLocked ? 0 : -2, boxShadow: isLocked ? undefined : '0 8px 32px rgba(18,184,152,0.18)' }}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #12B898, #2AC59D, #70DAAA)' }} />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative"
              style={{
                background: isLocked
                  ? 'rgba(148,163,184,0.1)'
                  : `linear-gradient(135deg, ${stageColors[index]}22, ${stageColors[index]}33)`,
                border: `1.5px solid ${isLocked ? 'rgba(148,163,184,0.2)' : stageColors[index] + '44'}`,
              }}
            >
              {isLocked ? (
                <Lock size={18} style={{ color: '#94A3B8' }} />
              ) : (
                <span>{stageIcons[index]}</span>
              )}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#12B898' }} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: isLocked ? 'rgba(148,163,184,0.1)' : `${stageColors[index]}18`,
                    color: isLocked ? '#94A3B8' : stageColors[index],
                  }}>
                  {stage.tag}
                </span>
              </div>
              <h3 className="font-semibold mt-0.5"
                style={{ color: isLocked ? '#94A3B8' : '#1F2937' }}>
                {stage.name}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: isLocked ? '#CBD5E1' : '#6B7280' }}>
                {stage.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StageStatusBadge status={stage.status} progress={stage.progress} />
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <ChevronRight size={16} style={{ color: isLocked ? '#CBD5E1' : '#9CA3AF' }} />
            </motion.div>
          </div>
        </div>

        {/* Growth path dots instead of percentage bar */}
        {isActive && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1.5">
                {GROWTH_STAGES.map((label, i) => {
                  const stageIdx = Math.floor((stage.progress / 100) * GROWTH_STAGES.length);
                  const isReached = i <= stageIdx;
                  const isCurrent = i === stageIdx;
                  return (
                    <div key={label} className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full transition-all"
                        style={{
                          background: isReached ? '#12B898' : 'rgba(18,184,152,0.2)',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(18,184,152,0.2)' : undefined,
                        }}
                      />
                      {i < GROWTH_STAGES.length - 1 && (
                        <div className="w-6 h-px" style={{ background: isReached ? '#12B898' : 'rgba(18,184,152,0.2)' }} />
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs ml-1" style={{ color: '#12B898' }}>
                {getGrowthStage(stage.progress)}
              </span>
            </div>
          </div>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && !isLocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(18,184,152,0.12)' }}>
                {stage.currentProgress.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {stage.currentProgress.map((p, pi) => {
                      const cappedTotal = Math.max(1, p.total);
                      const filledDots = Math.min(cappedTotal, p.value);
                      return (
                        <div key={p.label} className="p-2.5 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.6)' }}>
                          <div className="text-xs mb-1.5" style={{ color: '#6B7280' }}>{p.label}</div>
                          <div className="flex items-center gap-1 mb-1.5">
                            <InlineNum
                              value={p.value}
                              color={stageColors[index]}
                              onChange={v => onUpdateProgress(pi, 'value', v)}
                            />
                            <span className="text-xs" style={{ color: '#CBD5E1' }}>/</span>
                            <InlineNum
                              value={p.total}
                              color="#9CA3AF"
                              onChange={v => onUpdateProgress(pi, 'total', v)}
                            />
                          </div>
                          {/* Dot progress */}
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(cappedTotal, 10) }).map((_, di) => (
                              <div key={di}
                                className="flex-1 h-1.5 rounded-full"
                                style={{
                                  background: di < filledDots
                                    ? `linear-gradient(90deg, ${stageColors[index]}, ${stageColors[index]}88)`
                                    : 'rgba(18,184,152,0.12)',
                                }}
                              />
                            ))}
                          </div>
                          <div className="mt-1 text-[9px]" style={{ color: '#CBD5E1' }}>点击数字可编辑</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mb-3">
                  <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>通关条件</div>
                  <div className="space-y-1">
                    {stage.completionReqs.map((req, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#374151' }}>
                        <CheckCircle2 size={12}
                          style={{ color: isCompleted ? '#12B898' : '#D1D5DB', flexShrink: 0 }} />
                        {req}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI encouragement */}
                <div className="p-2.5 rounded-xl flex items-start gap-2"
                  style={{ background: 'rgba(18,184,152,0.06)', border: '1px solid rgba(18,184,152,0.12)' }}>
                  <span className="text-sm flex-shrink-0">☁️</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#12B898' }}>
                    {aiFeedback[index]}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {isExpanded && isLocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                <div className="text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>解锁条件</div>
                <div className="space-y-1">
                  {stage.completionReqs.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
                      <Lock size={12} style={{ flexShrink: 0 }} />
                      {req}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function Home() {
  const { user, stages, dailyTasks, applications, achievements, savedAccounts, loadAccount, resetCurrentAccount, exportCurrentAccount, updateStageProgress, initializeJourney } = useApp();
  const navigate = useNavigate();
  const [expandedStage, setExpandedStage] = useState<number | null>(2);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: user.name,
    targetJob: user.targetJob,
    targetCompany: user.targetCompany,
    university: user.university,
    grade: user.grade,
  });

  if (!user.hasSetup) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}>
              <Map size={16} color="white" />
            </div>
            <h1 className="text-gray-800">青云路径</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">先完成个人资料，再进入青云起航</p>
        </motion.div>

        {savedAccounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.03 }}
            className="glass-card rounded-2xl p-4 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">本机账号</div>
                <div className="text-xs text-gray-400">点击即可恢复上次分析后的状态</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(18,184,152,0.08)', color: '#12B898' }}>
                {savedAccounts.length} 个
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedAccounts.map(accountName => (
                <button
                  key={accountName}
                  onClick={() => loadAccount(accountName)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ background: 'rgba(18,184,152,0.08)', color: '#12B898', border: '1px solid rgba(18,184,152,0.15)' }}
                >
                  {accountName}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: '#12B898' }} />
            <h2 className="text-gray-800 text-sm font-semibold">填写你的个人资料</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              { key: 'name', label: '姓名', placeholder: '例如：林晓雨' },
              { key: 'grade', label: '年级', placeholder: '例如：大三' },
              { key: 'targetJob', label: '目标岗位', placeholder: '例如：产品经理' },
              { key: 'targetCompany', label: '目标公司', placeholder: '例如：互联网大厂' },
              { key: 'university', label: '学校', placeholder: '例如：北京某高校' },
            ] as const).map(field => (
              <div key={field.key}>
                <div className="text-xs text-gray-500 mb-1.5">{field.label}</div>
                <input
                  value={profileDraft[field.key]}
                  onChange={e => setProfileDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                />
              </div>
            ))}
          </div>

          <div className="rounded-xl p-3 mt-4 mb-4" style={{ background: 'rgba(18,184,152,0.06)', border: '1px solid rgba(18,184,152,0.12)' }}>
            <p className="text-xs text-gray-500">
              填写完资料后会直接进入青云起航，AI 会基于这些信息生成你的成长分析与计划。
            </p>
          </div>

          <motion.button
            onClick={() => {
              initializeJourney({
                name: profileDraft.name.trim() || '林晓雨',
                targetJob: profileDraft.targetJob.trim() || '产品经理',
                targetCompany: profileDraft.targetCompany.trim() || '互联网大厂',
                university: profileDraft.university.trim() || '北京某高校',
                grade: profileDraft.grade.trim() || '大三',
              });
              navigate('/launch');
            }}
            className="w-full py-3 rounded-2xl text-white font-medium flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)', boxShadow: '0 4px 16px rgba(18,184,152,0.3)' }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            进入青云起航
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const completedTasks = dailyTasks.filter(t => t.completed).length;
  const totalTasks = dailyTasks.length;

  const overallProgress = Math.round(
    ((stages.filter(s => s.status === 'completed').length * 100 +
      (stages.find(s => s.status === 'active')?.progress ?? 0)) /
      (stages.length * 100)) * 100
  );

  const activeApps = applications.filter(a => ['applied', 'viewed', 'interview'].includes(a.status)).length;
  const overallGrowthLabel = getGrowthStage(overallProgress);
  const matchLabel = formatJdMatchScore(user.matchScore);

  const handleExportAccount = () => {
    const payload = exportCurrentAccount();
    if (!payload) return;

    const blob = new Blob([payload.content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = payload.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setShowAccountMenu(false);
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
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-sm text-gray-400">你好 👋</div>
            <h1 className="text-gray-800">{user.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
              whileHover={{ scale: 1.05 }}
            >
              <Flame size={14} />
              <span className="text-sm font-semibold">{user.streak}天</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(18,184,152,0.1)', color: '#12B898' }}
              whileHover={{ scale: 1.05 }}
            >
              <Star size={14} />
              <span className="text-sm font-semibold">{user.xp} XP</span>
            </motion.div>
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(v => !v)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}
                title="切换账号或导出当前账号"
              >
                <Users size={13} /> 账号
              </button>

              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute right-0 top-11 z-30 w-56 rounded-2xl p-2"
                    style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 10px 30px rgba(15,23,42,0.12)', border: '1px solid rgba(148,163,184,0.18)' }}
                  >
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <div className="text-xs text-gray-400">当前账号</div>
                      <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
                    </div>

                    <div className="px-3 py-1.5 text-[11px] text-gray-400">切换账号</div>
                    <div className="space-y-1 max-h-44 overflow-auto pr-1">
                      {savedAccounts.length > 0 ? savedAccounts.map(accountName => (
                        <button
                          key={accountName}
                          onClick={() => {
                            loadAccount(accountName);
                            setShowAccountMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
                          style={{ background: accountName === user.name ? 'rgba(18,184,152,0.1)' : 'transparent', color: accountName === user.name ? '#12B898' : '#374151' }}
                        >
                          {accountName}
                        </button>
                      )) : (
                        <div className="px-3 py-2 text-xs text-gray-400">暂无可切换账号</div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
                      <button
                        onClick={handleExportAccount}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                      >
                        <Download size={14} style={{ color: '#3B82F6' }} /> 导出当前账号
                      </button>
                      <button
                        onClick={() => {
                          resetCurrentAccount();
                          setShowAccountMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Target size={14} style={{ color: '#64748B' }} /> 重开账号
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overall growth card — replaces percentage-heavy card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
        className="glass-card rounded-2xl p-5 mb-5"
        style={{ boxShadow: '0 4px 24px rgba(18,184,152,0.1)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}>
                <TrendingUp size={12} color="white" />
              </div>
              <span className="text-sm font-semibold text-gray-700">青云成长路径</span>
            </div>
            <p className="text-xs text-gray-400">你的成长路径正在逐渐清晰</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <GrowthStageBadge label={overallGrowthLabel} color="#12B898" />
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>青云起航：</span>
              <GrowthStageBadge label={matchLabel} color="#2AC59D" />
            </div>
          </div>
        </div>

        {/* Milestones path — dots instead of percentage bar */}
        <div className="flex items-center gap-2 mb-4">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-3 h-3 rounded-full"
                  style={{
                    background: s.status === 'locked' ? '#E2E8F0' : '#12B898',
                    boxShadow: s.status === 'active' ? '0 0 0 4px rgba(18,184,152,0.2)' : undefined,
                  }} />
              </div>
              {i < stages.length - 1 && (
                <div className="flex-1 h-px"
                  style={{
                    background: s.status === 'completed'
                      ? 'linear-gradient(90deg, #12B898, #2AC59D)'
                      : 'rgba(226,232,240,0.6)',
                  }} />
              )}
            </div>
          ))}
        </div>

        {/* Stage labels */}
        <div className="flex justify-between">
          {stages.map((s) => (
            <span key={s.id} className="text-[9px]"
              style={{ color: s.status === 'locked' ? '#CBD5E1' : '#12B898' }}>
              {s.name}
            </span>
          ))}
        </div>

        {/* Stats — no percentages, use counts and labels */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{user.totalApplied}</div>
            <div className="text-xs text-gray-400">总投递</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{user.totalInterviews}</div>
            <div className="text-xs text-gray-400">面试数</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: '#12B898' }}>{matchLabel}</div>
            <div className="text-xs text-gray-400">JD匹配度</div>
          </div>
        </div>

        {/* AI encouragement */}
        <div className="mt-4 p-2.5 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(18,184,152,0.06)' }}>
          <span className="text-sm">☁️</span>
          <p className="text-xs" style={{ color: '#12B898' }}>
            继续积累实践经验后，将逐渐进入更高成长阶段 ✨
          </p>
        </div>
      </motion.div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: Zap, label: '今日任务', value: `${completedTasks}/${totalTasks}`, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
          { icon: Building2, label: '投递中', value: `${activeApps}家`, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { icon: Target, label: '目标岗位', value: user.targetJob, color: '#12B898', bg: 'rgba(18,184,152,0.08)' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <motion.div
            key={label}
            className="glass-card rounded-2xl p-3 text-center"
            whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ background: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div className="font-semibold text-sm text-gray-800 truncate">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Path Map */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CloudIcon size={20} color="#12B898" />
            <h2 className="text-gray-800">青云路径</h2>
          </div>
          <span className="text-xs text-gray-400">点击展开详情</span>
        </div>

        <div className="relative">
          <div className="absolute left-[27px] top-12 bottom-12 w-0.5 z-0"
            style={{ background: 'linear-gradient(180deg, #12B898 0%, #2AC59D 40%, rgba(112,218,170,0.3) 70%, rgba(203,213,225,0.4) 100%)' }} />

          <div className="space-y-3 relative z-10">
            {[...stages].reverse().map((stage, i) => {
              const originalIndex = stages.length - 1 - i;
              return (
                <div key={stage.id} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 flex flex-col items-center mt-4">
                    <div
                      className="w-7 h-7 rounded-full border-2 flex items-center justify-center z-10 relative"
                      style={{
                        background: stage.status === 'locked' ? '#F8FAFC' : 'linear-gradient(135deg, #12B898, #2AC59D)',
                        borderColor: stage.status === 'locked' ? '#E2E8F0' : '#12B898',
                        boxShadow: stage.status === 'active' ? '0 0 0 4px rgba(18,184,152,0.2)' : undefined,
                      }}
                    >
                      {stage.status === 'locked' ? (
                        <Lock size={11} style={{ color: '#CBD5E1' }} />
                      ) : stage.status === 'completed' ? (
                        <CheckCircle2 size={11} color="white" />
                      ) : (
                        <ArrowUp size={11} color="white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <StageCard
                      stage={stage}
                      index={originalIndex}
                      isExpanded={expandedStage === stage.id}
                      onToggle={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                      onUpdateProgress={(pi, field, val) => updateStageProgress(stage.id, pi, field, val)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Tasks Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-4 mb-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
              <Calendar size={12} color="white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">今日青云任务</span>
          </div>
          <Link to="/daily" className="text-xs flex items-center gap-0.5" style={{ color: '#12B898' }}>
            全部 <ChevronRight size={12} />
          </Link>
        </div>

        <div className="space-y-2">
          {dailyTasks.map(task => (
            <div key={task.id}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: task.completed ? 'rgba(18,184,152,0.06)' : 'rgba(248,250,252,0.8)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: task.completed ? 'rgba(18,184,152,0.15)' : 'rgba(226,232,240,0.5)',
                }}>
                {task.completed ? (
                  <CheckCircle2 size={12} style={{ color: '#12B898' }} />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#E2E8F0' }} />
                )}
              </div>
              <span className="text-sm flex-1" style={{
                color: task.completed ? '#6B7280' : '#374151',
                textDecoration: task.completed ? 'line-through' : 'none',
              }}>
                {task.title}
              </span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(18,184,152,0.1)', color: '#12B898' }}>
                +{task.xp}XP
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-400">{completedTasks}/{totalTasks} 完成</div>
          <div className="h-1.5 flex-1 mx-3 rounded-full overflow-hidden" style={{ background: 'rgba(18,184,152,0.1)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${(completedTasks / totalTasks) * 100}%`,
                background: 'linear-gradient(90deg, #12B898, #2AC59D)',
              }} />
          </div>
          <div className="text-xs font-medium" style={{ color: '#12B898' }}>
            {completedTasks === totalTasks ? '全部完成 🎉' : `${completedTasks}/${totalTasks}`}
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 gap-3 mb-4"
      >
        <Link to="/inn">
          <motion.div
            className="glass-card rounded-2xl p-4 flex items-center gap-3"
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(18,184,152,0.15)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{ border: '1px solid rgba(18,184,152,0.15)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(18,184,152,0.15), rgba(42,197,157,0.2))' }}>
              <Building2 size={18} style={{ color: '#12B898' }} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">投递实习</div>
              <div className="text-xs text-gray-400">{activeApps}个跟进中</div>
            </div>
          </motion.div>
        </Link>

        <Link to="/launch">
          <motion.div
            className="rounded-2xl p-4 flex items-center gap-3"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              background: 'linear-gradient(135deg, #12B898, #2AC59D)',
              boxShadow: '0 4px 16px rgba(18,184,152,0.3)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">AI分析</div>
              <div className="text-xs text-white/70">更新路径</div>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Achievement preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={16} style={{ color: '#F59E0B' }} />
            <span className="text-sm font-semibold text-gray-700">青云成就</span>
          </div>
          <span className="text-xs" style={{ color: '#12B898' }}>{achievements.filter(item => item.unlocked).length}/{achievements.length} 解锁</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {achievements.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: achievement.unlocked ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.2))' : 'rgba(226,232,240,0.5)',
                border: achievement.unlocked ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(226,232,240,0.8)',
                filter: achievement.unlocked ? 'none' : 'grayscale(1) opacity(0.4)',
              }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {achievement.emoji}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
