import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, CheckCircle2, Circle, Flame, Star, Trophy,
  Send, Mic2, FileText, RotateCcw, Sparkles,
  Pencil, X, Check, Lightbulb,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const TASK_ICONS = {
  apply: Send,
  interview: Mic2,
  resume: FileText,
  review: RotateCcw,
};

const TASK_COLORS = {
  apply: { bg: 'rgba(18,184,152,0.1)', color: '#12B898', gradStart: '#12B898', gradEnd: '#2AC59D' },
  interview: { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6', gradStart: '#8B5CF6', gradEnd: '#A78BFA' },
  resume: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', gradStart: '#F59E0B', gradEnd: '#FCD34D' },
  review: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', gradStart: '#3B82F6', gradEnd: '#60A5FA' },
};

// Interview practice data (from 青云面斋)
const CATEGORIES = ['全部', '产品经验', '用户研究', '竞品分析', '数据思维', '职业认知'];

const DIFFICULTY_CONFIG = {
  easy: { label: '基础', color: '#12B898', bg: 'rgba(18,184,152,0.1)' },
  medium: { label: '进阶', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  hard: { label: '挑战', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

function ConfettiParticle({ x, color }: { x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm pointer-events-none"
      style={{ left: `${x}%`, top: 0, background: color }}
      initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ y: 80, opacity: 0, rotate: 360, scale: 0.5, x: (x - 50) * 0.8 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  );
}

interface TaskEditState {
  taskId: string | null;
  name: string;
  content: string;
}

export function Daily() {
  const { user, dailyTasks, dailyTaskOverrides, updateDailyTaskOverride, completeTask, setXiaoYunMessage, questions, toggleQuestion, achievements } = useApp();
  const [confettiKey, setConfettiKey] = useState(0);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // Task editing state
  const [editState, setEditState] = useState<TaskEditState>({ taskId: null, name: '', content: '' });

  // Interview practice state
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const completedCount = dailyTasks.filter(t => t.completed).length;
  const totalXP = dailyTasks.filter(t => t.completed).reduce((sum, t) => sum + t.xp, 0);
  const allDone = completedCount === dailyTasks.length;

  const filteredQuestions = selectedCategory === '全部'
    ? questions
    : questions.filter(q => q.category === selectedCategory);

  const practicedCount = questions.filter(q => q.practiced).length;

  const handleComplete = (taskId: string) => {
    setJustCompleted(taskId);
    setConfettiKey(k => k + 1);
    completeTask(taskId);
    setTimeout(() => setJustCompleted(null), 600);
  };

  const openEdit = (taskId: string, currentTitle: string, currentDesc: string) => {
    setEditState({ taskId, name: currentTitle, content: currentDesc });
  };

  const saveEdit = () => {
    if (!editState.taskId) return;
    updateDailyTaskOverride(editState.taskId, { title: editState.name, description: editState.content });
    setEditState({ taskId: null, name: '', content: '' });
  };

  const getTaskDisplay = (task: typeof dailyTasks[0]) => {
    const custom = dailyTaskOverrides[task.id];
    return {
      title: custom?.title ?? task.title,
      description: custom?.description ?? task.description,
    };
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
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
            <Zap size={16} color="white" />
          </div>
          <h1 className="text-gray-800">青云每日</h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">今日求职挑战中心</p>
      </motion.div>

      {/* Streak + XP banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
        className="rounded-2xl p-5 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}
      >
        <div className="absolute -top-4 -right-4 opacity-10">
          <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
            <ellipse cx="60" cy="50" rx="52" ry="22" fill="white" />
            <ellipse cx="38" cy="36" rx="30" ry="24" fill="white" />
            <ellipse cx="84" cy="33" rx="28" ry="22" fill="white" />
            <ellipse cx="60" cy="26" rx="26" ry="22" fill="white" />
          </svg>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="text-white">
            <div className="text-sm opacity-80 mb-1">今日进度</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{completedCount}</span>
              <span className="text-xl opacity-70">/{dailyTasks.length}</span>
            </div>
            <div className="text-sm opacity-80 mt-0.5">任务完成</div>
          </div>

          <div className="text-right text-white">
            <div className="flex items-center justify-end gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20">
                <Flame size={14} />
                <span className="font-semibold">{user.streak}天连胜</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-xl bg-white/15">
              <Star size={14} />
              <span className="font-semibold">今日 +{totalXP} XP</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {dailyTasks.map((task) => (
            <motion.div
              key={task.id}
              className="flex-1 h-1.5 rounded-full"
              style={{ background: task.completed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
              initial={false}
              animate={{ scaleX: task.completed ? 1 : 0.95 }}
              transition={{ type: 'spring', stiffness: 400 }}
            />
          ))}
        </div>
      </motion.div>

      {/* All done banner */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-2xl p-4 mb-5 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.12))',
              border: '1.5px solid rgba(245,158,11,0.25)',
            }}
          >
            <div className="text-3xl">🎉</div>
            <div>
              <div className="font-semibold text-gray-800">今日任务全部完成！</div>
              <div className="text-sm text-gray-500">小云超级骄傲！你离青云更近一步了 ✨</div>
            </div>
            <Trophy size={24} style={{ color: '#F59E0B', marginLeft: 'auto' }} className="flex-shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Edit Modal */}
      <AnimatePresence>
        {editState.taskId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setEditState({ taskId: null, name: '', content: '' })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-gray-800">编辑今日任务</span>
                <button onClick={() => setEditState({ taskId: null, name: '', content: '' })}>
                  <X size={18} style={{ color: '#9CA3AF' }} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">任务名称</div>
                  <input
                    value={editState.name}
                    onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{
                      background: 'rgba(247,255,252,0.9)',
                      border: '1px solid rgba(18,184,152,0.25)',
                      color: '#374151',
                    }}
                    placeholder="输入任务名称..."
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">任务内容</div>
                  <textarea
                    value={editState.content}
                    onChange={e => setEditState(s => ({ ...s, content: e.target.value }))}
                    rows={3}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none resize-none"
                    style={{
                      background: 'rgba(247,255,252,0.9)',
                      border: '1px solid rgba(18,184,152,0.25)',
                      color: '#374151',
                    }}
                    placeholder="描述任务具体内容..."
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditState({ taskId: null, name: '', content: '' })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(226,232,240,0.6)', color: '#6B7280' }}
                >
                  取消
                </button>
                <motion.button
                  onClick={saveEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Check size={14} /> 确定
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task cards */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-gray-700">今日三件事</h2>
          {/* Edit button replaces "约30分钟完成" */}
        </div>

        {dailyTasks.map((task, index) => {
          const Icon = TASK_ICONS[task.type];
          const colors = TASK_COLORS[task.type];
          const display = getTaskDisplay(task);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.1 }}
              className="relative overflow-hidden"
            >
              {/* Confetti */}
              {justCompleted === task.id && (
                <div key={confettiKey} className="absolute inset-0 pointer-events-none z-20">
                  {[15, 30, 45, 60, 75, 85].map((x, i) => (
                    <ConfettiParticle
                      key={i}
                      x={x}
                      color={['#12B898', '#2AC59D', '#70DAAA', '#F59E0B', '#8B5CF6'][i % 5]}
                    />
                  ))}
                </div>
              )}

              <motion.div
                className="glass-card rounded-2xl p-4 flex items-start gap-3"
                style={{
                  background: task.completed
                    ? 'rgba(243,250,248,0.85)'
                    : 'rgba(255,255,255,0.75)',
                  border: task.completed
                    ? '1.5px solid rgba(18,184,152,0.2)'
                    : '1px solid rgba(255,255,255,0.6)',
                  boxShadow: task.completed ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
                }}
                whileHover={{ y: task.completed ? 0 : -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{
                    background: task.completed
                      ? 'rgba(18,184,152,0.1)'
                      : `linear-gradient(135deg, ${colors.gradStart}, ${colors.gradEnd})`,
                  }}
                  onClick={() => !task.completed && handleComplete(task.id)}
                >
                  <Icon size={18} color={task.completed ? '#12B898' : 'white'} />
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => !task.completed && handleComplete(task.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold"
                      style={{
                        color: task.completed ? '#6B7280' : '#1F2937',
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}>
                      {display.title}
                    </h3>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: task.completed ? 'rgba(18,184,152,0.1)' : `${colors.bg}`,
                        color: task.completed ? '#12B898' : colors.color,
                      }}
                    >
                      +{task.xp}XP
                    </span>
                  </div>
                  <p className="text-xs mt-1"
                    style={{ color: task.completed ? '#9CA3AF' : '#6B7280' }}>
                    {display.description}
                  </p>
                </div>

                {/* Edit button + checkbox */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(task.id, display.title, display.description)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(226,232,240,0.5)', color: '#9CA3AF' }}
                    title="编辑任务"
                  >
                    <Pencil size={12} />
                  </button>
                  <motion.div
                    onClick={() => !task.completed && handleComplete(task.id)}
                    className="cursor-pointer"
                    whileTap={{ scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {task.completed ? (
                      <CheckCircle2 size={22} style={{ color: '#12B898' }} />
                    ) : (
                      <Circle size={22} style={{ color: '#D1D5DB' }} />
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Interview Practice Section (moved from 青云面斋) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-4 mb-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
            <Mic2 size={13} color="white" />
          </div>
          <h2 className="text-gray-700 text-sm font-semibold">面试备战</h2>
          <span className="ml-auto text-xs" style={{ color: '#8B5CF6' }}>
            {practicedCount}/{questions.length} 已练
          </span>
        </div>

        {/* AI tip */}
        <div className="rounded-xl p-2.5 mb-3 flex items-start gap-2"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <Lightbulb size={13} style={{ color: '#8B5CF6', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: '#6B7280' }}>
            <span className="font-medium" style={{ color: '#8B5CF6' }}>小云提示：</span>
            用STAR框架作答，让面试官看见你的思维逻辑！
          </p>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: selectedCategory === cat ? 'rgba(139,92,246,0.1)' : 'rgba(226,232,240,0.5)',
                color: selectedCategory === cat ? '#8B5CF6' : '#6B7280',
                border: selectedCategory === cat ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Practice progress */}
        <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl"
          style={{ background: 'rgba(139,92,246,0.05)' }}>
          <div className="flex-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(practicedCount / questions.length) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="text-sm font-bold" style={{ color: '#8B5CF6' }}>
            {Math.round((practicedCount / questions.length) * 100)}%
          </div>
        </div>

        {/* Question cards */}
        <div className="space-y-2">
          {filteredQuestions.map((q, i) => {
            const diffCfg = DIFFICULTY_CONFIG[q.difficulty];
            const isExpanded = expandedQuestion === q.id;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(248,250,252,0.8)',
                  border: '1px solid rgba(226,232,240,0.6)',
                }}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={e => { e.stopPropagation(); toggleQuestion(q.id); }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {q.practiced ? (
                        <CheckCircle2 size={18} style={{ color: '#8B5CF6' }} />
                      ) : (
                        <Circle size={18} style={{ color: '#D1D5DB' }} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280' }}>
                          {q.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: diffCfg.bg, color: diffCfg.color }}>
                          {diffCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed"
                        style={{
                          textDecoration: q.practiced ? 'line-through' : 'none',
                          color: q.practiced ? '#9CA3AF' : '#374151',
                        }}>
                        {q.text}
                      </p>
                    </div>

                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown size={14} style={{ color: '#9CA3AF' }} />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3"
                        style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
                        <div className="mt-2.5 p-2.5 rounded-xl"
                          style={{ background: 'rgba(139,92,246,0.06)' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Star size={12} style={{ color: '#8B5CF6' }} />
                            <span className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>STAR 框架提示</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                            {q.starTips}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleQuestion(q.id)}
                          className="mt-2.5 w-full py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: q.practiced
                              ? 'rgba(226,232,240,0.6)'
                              : 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                            color: q.practiced ? '#6B7280' : 'white',
                          }}
                        >
                          {q.practiced ? '标记为未练习' : '✓ 标记已练习'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Achievement progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card rounded-2xl p-4 mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} style={{ color: '#F59E0B' }} />
          <h2 className="text-gray-700 text-sm font-semibold">青云称号进度</h2>
        </div>

        <div className="space-y-3">
          {achievements.map(ach => (
            <div key={ach.id} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{
                  background: ach.unlocked
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.2))'
                    : 'rgba(226,232,240,0.5)',
                  border: ach.unlocked ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(226,232,240,0.8)',
                  filter: ach.unlocked ? 'none' : 'grayscale(0.5) opacity(0.6)',
                }}
              >
                {ach.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-gray-700">{ach.title}</span>
                  <span className="text-xs text-gray-400">{ach.progress}/{ach.total}</span>
                </div>
                <div className="text-xs text-gray-400 mb-1.5">{ach.desc}</div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(226,232,240,0.6)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: ach.unlocked
                        ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                        : 'linear-gradient(90deg, #12B898, #2AC59D)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(ach.progress / ach.total) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Streak calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={16} style={{ color: '#F59E0B' }} />
            <h2 className="text-gray-700 text-sm font-semibold">连胜记录</h2>
          </div>
          <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>🔥 {user.streak}天</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, i) => {
            const isRecent = i >= 35 - user.streak - 2;
            const isToday = i === 34;
            const isActive = i >= 35 - user.streak;
            return (
              <motion.div
                key={i}
                className="aspect-square rounded-lg"
                style={{
                  background: isActive
                    ? isToday
                      ? 'linear-gradient(135deg, #F59E0B, #FCD34D)'
                      : 'linear-gradient(135deg, #12B898, #2AC59D)'
                    : isRecent
                      ? 'rgba(18,184,152,0.1)'
                      : 'rgba(226,232,240,0.4)',
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.01 + 0.4, type: 'spring', stiffness: 400, damping: 20 }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>5周前</span>
          <span>今天</span>
        </div>
      </motion.div>
    </div>
  );
}
