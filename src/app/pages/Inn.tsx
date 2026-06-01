import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, MapPin, DollarSign, Clock, ChevronRight,
  CheckCircle2, Eye, MessageSquare, FileText,
  Plus, Briefcase, Sparkles, Bell, Settings,
  Pencil, X, Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Application, ResumeEntry } from '../context/AppContext';

const STATUS_CONFIG = {
  applied: {
    label: '已投递',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.1)',
    icon: CheckCircle2,
    desc: '等待反馈中',
  },
  viewed: {
    label: '已查看',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.1)',
    icon: Eye,
    desc: '简历已被查看',
  },
  interview: {
    label: '面试',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
    icon: MessageSquare,
    desc: '收到面试邀请',
  },
  offer: {
    label: 'Offer',
    color: '#12B898',
    bg: 'rgba(18,184,152,0.1)',
    icon: Sparkles,
    desc: '🎉 恭喜拿到Offer！',
  },
  rejected: {
    label: '已结束',
    color: '#CBD5E1',
    bg: 'rgba(203,213,225,0.15)',
    icon: X,
    desc: '积累经验，继续向前',
  },
};

// Only these statuses shown in quick-select (exclude rejected)
const QUICK_STATUS_KEYS: Application['status'][] = ['applied', 'viewed', 'interview', 'offer'];

function StatusPill({ status }: { status: Application['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

interface EditModalData {
  appId: string;
  location: string;
  salary: string;
  appliedDate: string;
  notes: string;
}

function ApplicationCard({ app, onStatusChange, onEdit, onPreviewResume, resumeVersionLabel }: {
  app: Application;
  onStatusChange: (id: string, status: Application['status']) => void;
  onEdit: (data: EditModalData) => void;
  onPreviewResume: () => void;
  resumeVersionLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const isRejected = app.status === 'rejected';
  const waitAnxious = app.status === 'applied' && app.waitDays >= 3;

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsHighlighted(true);
      setTimeout(() => setIsHighlighted(false), 300);
      onEdit({
        appId: app.id,
        location: app.location,
        salary: app.salary,
        appliedDate: app.appliedDate,
        notes: '',
      });
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: isRejected ? 'rgba(248,250,252,0.6)' : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(8px)',
        border: isRejected
          ? '1px solid rgba(203,213,225,0.4)'
          : isHighlighted
            ? '1.5px solid rgba(18,184,152,0.5)'
            : '1px solid rgba(226,232,240,0.5)',
        boxShadow: isRejected ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
        opacity: isRejected ? 0.65 : 1,
        filter: isRejected ? 'grayscale(0.3)' : 'none',
      }}
      onPointerDown={handleLongPressStart}
      onPointerUp={handleLongPressEnd}
      onPointerLeave={handleLongPressEnd}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{
              background: isRejected
                ? 'rgba(203,213,225,0.5)'
                : `linear-gradient(135deg, ${app.companyColor}, ${app.companyColor}99)`,
            }}
          >
            <span style={{ color: isRejected ? '#9CA3AF' : 'white' }}>{app.company[0]}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm" style={{ color: isRejected ? '#9CA3AF' : '#1F2937' }}>
                  {app.company}
                </div>
                <div className="text-xs mt-0.5" style={{ color: isRejected ? '#CBD5E1' : '#6B7280' }}>
                  {app.position}
                </div>
              </div>
              <StatusPill status={app.status} />
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: isRejected ? '#CBD5E1' : '#9CA3AF' }}>
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {app.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign size={10} /> {app.salary}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> {app.appliedDate}
              </span>
            </div>

            {resumeVersionLabel && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: isRejected ? 'rgba(248,250,252,0.9)' : 'rgba(18,184,152,0.1)', color: isRejected ? '#94A3B8' : '#12B898' }}>
                <FileText size={10} /> 投递简历版本：{resumeVersionLabel}
              </div>
            )}

            {waitAnxious && !isRejected && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6' }}
              >
                <Bell size={11} />
                该岗平均反馈3–5天，正常哦，再等等～
              </motion.div>
            )}

            {app.status === 'offer' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl"
                style={{ background: 'rgba(18,184,152,0.1)', color: '#12B898' }}
              >
                <Sparkles size={11} />
                🎉 恭喜！成功拿到Offer！
              </motion.div>
            )}

            {isRejected && (
              <div className="mt-1.5 text-[10px]" style={{ color: '#CBD5E1' }}>
                轻轻翻过这一页，继续向前看 ☁️
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: quick status update */}
      <AnimatePresence>
        {expanded && !isRejected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1"
              style={{ borderTop: '1px solid rgba(18,184,152,0.08)' }}>
              <div className="text-xs text-gray-400 mb-2 font-medium">更新投递状态</div>
              <div className="flex flex-wrap gap-2">
                {QUICK_STATUS_KEYS.map(s => {
                  const sCfg = STATUS_CONFIG[s];
                  const Icon = sCfg.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => onStatusChange(app.id, s)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: app.status === s ? sCfg.bg : 'rgba(248,250,252,0.8)',
                        color: app.status === s ? sCfg.color : '#6B7280',
                        border: app.status === s ? `1px solid ${sCfg.color}33` : '1px solid rgba(226,232,240,0.8)',
                      }}
                    >
                      <Icon size={11} /> {sCfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Edit details button */}
              <button
                onClick={() => onEdit({
                  appId: app.id,
                  location: app.location,
                  salary: app.salary,
                  appliedDate: app.appliedDate,
                  notes: '',
                })}
                className="mt-2.5 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl"
                style={{ background: 'rgba(18,184,152,0.07)', color: '#12B898' }}
              >
                <Pencil size={11} /> 编辑投递信息
              </button>
              <button
                onClick={onPreviewResume}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6' }}
              >
                <Eye size={11} /> 查看用于投递的简历
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface AddAppForm {
  company: string;
  position: string;
  location: string;
  salary: string;
  appliedDate: string;
}

export function Inn() {
  const { applications, updateApplicationStatus, addApplication, resumeEntries, editApplication } = useApp();
  const [previewEntry, setPreviewEntry] = useState<ResumeEntry | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Application['status'] | 'all'>('all');
  const [sortByDate, setSortByDate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [editValues, setEditValues] = useState<{ location: string; salary: string; appliedDate: string; notes: string }>({
    location: '', salary: '', appliedDate: '', notes: '',
  });
  const [addForm, setAddForm] = useState<AddAppForm>({
    company: '', position: '', location: '', salary: '', appliedDate: new Date().toISOString().slice(0, 10),
  });

  // Only show applied/interview/offer in top stats
  const statusCounts = {
    applied: applications.filter(a => a.status === 'applied').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
  };

  let filtered = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus);

  if (sortByDate) {
    filtered = [...filtered].sort((a, b) =>
      new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
    );
  }

  const openEditModal = (data: EditModalData) => {
    setEditModal(data);
    setEditValues({ location: data.location, salary: data.salary, appliedDate: data.appliedDate, notes: data.notes });
  };

  const saveEdit = () => {
    if (!editModal) return;
    // persist edited fields to the application
    editApplication(editModal.appId, {
      location: editValues.location,
      salary: editValues.salary,
      appliedDate: editValues.appliedDate,
    });
    setEditModal(null);
  };

  const getResumeVersionLabel = (resumeVersionId?: string) => {
    const entry = resumeEntries.find(r => r.id === resumeVersionId) ?? resumeEntries.find(r => r.isDefault) ?? resumeEntries[0] ?? null;
    if (!entry) return '未绑定简历版本';
    const versionLabel = entry.version ? `V${entry.version}` : '默认版本';
    return entry.isDefault ? `${versionLabel} · 默认` : versionLabel;
  };

  const openResumePreview = (resumeVersionId?: string) => {
    const entry = resumeEntries.find(r => r.id === resumeVersionId) ?? resumeEntries.find(r => r.isDefault) ?? resumeEntries[0] ?? null;
    if (!entry) {
      setPreviewEntry(null);
      setPreviewNotice('当前没有可预览的简历版本，请先在简历库创建或设置一个默认版本。');
      setShowPreviewModal(true);
      return;
    }
    setPreviewNotice(null);
    setPreviewEntry(entry);
    setShowPreviewModal(true);
  };

  const handleAddApp = () => {
    if (!addForm.company.trim() || !addForm.position.trim()) return;
    // choose default resume version if available
    const defaultEntry = resumeEntries.find(e => e.isDefault) ?? resumeEntries[0] ?? null;
    addApplication({
      id: `a${Date.now()}`,
      company: addForm.company,
      companyColor: '#12B898',
      position: addForm.position,
      status: 'applied',
      appliedDate: addForm.appliedDate,
      waitDays: 0,
      stage: 2,
      location: addForm.location || '待定',
      salary: addForm.salary || '面议',
      resumeVersionId: defaultEntry?.id,
    });
    setAddForm({ company: '', position: '', location: '', salary: '', appliedDate: new Date().toISOString().slice(0, 10) });
    setShowAddModal(false);
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}>
              <Building2 size={16} color="white" />
            </div>
            <div>
              <h1 className="text-gray-800">青云驿馆</h1>
              <p className="text-sm text-gray-500">实习投递管家</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #12B898, #2AC59D)', color: 'white' }}
            >
              <Plus size={14} /> 添加新投递
            </button>
          </div>
        </div>
      </motion.div>

      {/* Summary cards — only 3 positive stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {([
          { key: 'applied', label: '已投递', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
          { key: 'interview', label: '面试', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
          { key: 'offer', label: 'Offer', color: '#12B898', bg: 'rgba(18,184,152,0.1)' },
        ] as { key: keyof typeof statusCounts; label: string; color: string; bg: string }[]).map(({ key, label, color, bg }) => (
          <motion.button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className="p-3 rounded-2xl text-center transition-all"
            style={{
              background: filterStatus === key ? bg : 'rgba(255,255,255,0.6)',
              border: filterStatus === key ? `1.5px solid ${color}33` : '1px solid rgba(226,232,240,0.6)',
              boxShadow: filterStatus === key ? `0 2px 12px ${color}18` : 'none',
            }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="text-xl font-bold" style={{ color }}>{statusCounts[key]}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
          </motion.button>
        ))}
      </div>

      {/* Section title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase size={15} style={{ color: '#12B898' }} />
          <span className="text-sm font-semibold text-gray-700">我的投递</span>
        </div>
      </div>

      {/* Filter tabs row with scrollable tabs + gear icon at right */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterStatus('all')}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: filterStatus === 'all' ? 'rgba(18,184,152,0.1)' : 'rgba(226,232,240,0.5)',
              color: filterStatus === 'all' ? '#12B898' : '#6B7280',
            }}
          >
            全部 ({applications.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as Application['status'][]).filter(s => s !== 'rejected').map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: filterStatus === s ? STATUS_CONFIG[s].bg : 'rgba(226,232,240,0.5)',
                color: filterStatus === s ? STATUS_CONFIG[s].color : '#6B7280',
              }}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Settings gear at far right */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowSettings(v => !v)}
            className="p-2 rounded-xl transition-all"
            style={{
              background: showSettings ? 'rgba(18,184,152,0.1)' : 'rgba(226,232,240,0.5)',
              color: showSettings ? '#12B898' : '#6B7280',
            }}
          >
            <Settings size={15} />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute right-0 top-10 z-30 rounded-2xl p-2 w-44"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(18,184,152,0.15)',
                }}
              >
                <button
                  onClick={() => { setShowAddModal(true); setShowSettings(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-green-50 transition-colors"
                >
                  <Plus size={14} style={{ color: '#12B898' }} />
                  添加投递公司
                </button>
                <button
                  onClick={() => { setSortByDate(v => !v); setShowSettings(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-green-50 transition-colors"
                >
                  <Clock size={14} style={{ color: '#12B898' }} />
                  {sortByDate ? '取消时间排序' : '按投递时间排序'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Applications list */}
      <div className="space-y-3">
        {filtered.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
          >
            <ApplicationCard
              app={app}
              onStatusChange={updateApplicationStatus}
              onEdit={openEditModal}
              onPreviewResume={() => openResumePreview(app.resumeVersionId)}
              resumeVersionLabel={getResumeVersionLabel(app.resumeVersionId)}
            />
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm">暂无投递记录</div>
          </div>
        )}
      </div>

      {/* Long-press hint */}
      <div className="mt-3 text-center text-xs text-gray-300">长按卡片可快速编辑 · 点击展开更新状态</div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setEditModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full max-w-2xl rounded-t-3xl p-6 pb-8"
              style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="font-semibold text-gray-800">编辑投递信息</span>
                <button onClick={() => setEditModal(null)}>
                  <X size={18} style={{ color: '#9CA3AF' }} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">地点</div>
                  <input
                    value={editValues.location}
                    onChange={e => setEditValues(v => ({ ...v, location: e.target.value }))}
                    placeholder="如：北京、深圳"
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">薪资</div>
                  <input
                    value={editValues.salary}
                    onChange={e => setEditValues(v => ({ ...v, salary: e.target.value }))}
                    placeholder="如：250元/天"
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">投递时间</div>
                  <input
                    type="date"
                    value={editValues.appliedDate}
                    onChange={e => setEditValues(v => ({ ...v, appliedDate: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">备注（面试记录等）</div>
                  <textarea
                    value={editValues.notes}
                    onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                    rows={2}
                    placeholder="添加面试记录或个人备注..."
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none resize-none"
                    style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditModal(null)}
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
                  <Check size={14} /> 保存
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full max-w-2xl rounded-t-3xl p-6 pb-8"
              style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">用于投递的简历版本</span>
                <button onClick={() => setShowPreviewModal(false)}>
                  <X size={18} style={{ color: '#9CA3AF' }} />
                </button>
              </div>

              {!previewEntry ? (
                <div className="rounded-2xl p-4 mt-2" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.9)' }}>
                  <div className="text-sm font-medium text-gray-700 mb-1">暂无可预览内容</div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {previewNotice ?? '当前投递记录没有绑定有效简历版本。'}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-400 mb-4">{previewEntry.company} · {previewEntry.position}</div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-4" style={{ background: 'rgba(18,184,152,0.1)', color: '#12B898' }}>
                    <FileText size={10} /> {previewEntry.isDefault ? '默认投递版本' : `版本 V${previewEntry.version ?? 1}`}
                  </div>
                  <div className="text-sm text-gray-700 space-y-2 max-h-72 overflow-auto">
                    <div>公司：{previewEntry.company}</div>
                    <div>岗位：{previewEntry.position}</div>
                    <div>阶段：{previewEntry.stage}</div>
                    <div>技能：{previewEntry.skills.join(' / ') || '暂无'}</div>
                    <div className="pt-2 border-t border-gray-100">
                      {previewEntry.bullets.map((b, i) => <div key={i} className="mb-1">• {b}</div>)}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Application Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full max-w-2xl rounded-t-3xl p-6 pb-8"
              style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">添加投递公司</span>
                <button onClick={() => setShowAddModal(false)}>
                  <X size={18} style={{ color: '#9CA3AF' }} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">填写投递的公司信息，帮你追踪投递进度</p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">公司名称 *</div>
                    <input
                      value={addForm.company}
                      onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="如：字节跳动"
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">岗位名称 *</div>
                    <input
                      value={addForm.position}
                      onChange={e => setAddForm(f => ({ ...f, position: e.target.value }))}
                      placeholder="如：产品经理实习"
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">地点</div>
                    <input
                      value={addForm.location}
                      onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="如：北京"
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">薪资</div>
                    <input
                      value={addForm.salary}
                      onChange={e => setAddForm(f => ({ ...f, salary: e.target.value }))}
                      placeholder="如：250元/天"
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">投递时间</div>
                  <input
                    type="date"
                    value={addForm.appliedDate}
                    onChange={e => setAddForm(f => ({ ...f, appliedDate: e.target.value }))}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: 'rgba(247,255,252,0.9)', border: '1px solid rgba(18,184,152,0.25)', color: '#374151' }}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(226,232,240,0.6)', color: '#6B7280' }}
                >
                  取消
                </button>
                <motion.button
                  onClick={handleAddApp}
                  disabled={!addForm.company.trim() || !addForm.position.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5"
                  style={{
                    background: addForm.company.trim() && addForm.position.trim()
                      ? 'linear-gradient(135deg, #12B898, #2AC59D)'
                      : 'rgba(226,232,240,0.6)',
                    color: addForm.company.trim() && addForm.position.trim() ? 'white' : '#9CA3AF',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Check size={14} /> 添加投递
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
