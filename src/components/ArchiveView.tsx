import React, { useState, useEffect } from 'react';
import { Member, Task } from '../types';
import { RotateCcw, Trash2, CheckCircle2, Calendar, CheckSquare, Inbox, Copy, Check } from 'lucide-react';
import { formatTasksPrettyPrint, copyToClipboard } from '../utils/taskExport';

interface ArchiveViewProps {
  members: Member[];
  onUnarchiveTask: (taskId: string) => void;
  onDeleteTaskPermanently: (taskId: string) => void;
  onArchivedCountChange?: (count: number) => void;
}

function formatDateGroup(dateStr?: string): { key: string; label: string } {
  if (!dateStr) return { key: 'unknown', label: '早期完成' };
  const d = new Date(dateStr);
  const now = new Date();

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

  if (isToday) {
    return { key: dateKey, label: `今天 · ${d.getMonth() + 1}月${d.getDate()}日` };
  }
  if (isYesterday) {
    return { key: dateKey, label: `昨天 · ${d.getMonth() + 1}月${d.getDate()}日` };
  }

  return { key: dateKey, label: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` };
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  members,
  onUnarchiveTask,
  onDeleteTaskPermanently,
  onArchivedCountChange,
}) => {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedDateKey, setCopiedDateKey] = useState<string | null>(null);

  const handleCopyDateGroup = async (
    colName: string,
    group: { key: string; label: string; tasks: Task[] },
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (group.tasks.length === 0) return;

    const formatted = formatTasksPrettyPrint({
      title: `${colName} · ${group.label}`,
      subTitle: '归档任务清单',
      tasks: group.tasks,
      members,
    });

    const success = await copyToClipboard(formatted);
    if (success) {
      setCopiedDateKey(`${colName}-${group.key}`);
      setTimeout(() => setCopiedDateKey(null), 2000);
    }
  };

  const fetchArchived = async () => {
    try {
      const res = await fetch('/api/tasks/archived');
      if (res.ok) {
        const data: Task[] = await res.json();
        setArchivedTasks(data);
        onArchivedCountChange?.(data.length);
      }
    } catch (err) {
      console.error('Failed to load archived tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleUnarchive = async (taskId: string) => {
    setArchivedTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      onArchivedCountChange?.(next.length);
      return next;
    });
    onUnarchiveTask(taskId);
  };

  const handleDelete = async (taskId: string) => {
    setArchivedTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      onArchivedCountChange?.(next.length);
      return next;
    });
    onDeleteTaskPermanently(taskId);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-7 h-7 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-3" />
        <p className="text-xs">载入中...</p>
      </div>
    );
  }

  // Define columns: One per member + Unassigned (if any unassigned tasks exist)
  const columnsList: { id: string; name: string; avatarColor?: string; isUnassigned?: boolean }[] = [
    ...members.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor })),
  ];

  const unassignedTasks = archivedTasks.filter((t) => !t.assigneeId);
  if (unassignedTasks.length > 0) {
    columnsList.push({ id: '__unassigned__', name: '未分配', isUnassigned: true });
  }

  return (
    <div className="flex-1 flex flex-col pt-1">
      {/* Columns Container: One column per member */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-8 pt-1 px-1 no-scrollbar items-start snap-x snap-mandatory sm:snap-none">
        {columnsList.map((col) => {
          const colTasks = archivedTasks
            .filter((t) => (col.isUnassigned ? !t.assigneeId : t.assigneeId === col.id))
            .sort((a, b) => {
              const timeA = new Date(a.completedAt || a.archivedAt || a.createdAt).getTime();
              const timeB = new Date(b.completedAt || b.archivedAt || b.createdAt).getTime();
              return timeB - timeA; // Newest first
            });

          // Group by completion date
          const groups: { key: string; label: string; tasks: Task[] }[] = [];
          colTasks.forEach((t) => {
            const dateStr = t.completedAt || t.archivedAt || t.createdAt;
            const { key, label } = formatDateGroup(dateStr);
            let group = groups.find((g) => g.key === key);
            if (!group) {
              group = { key, label, tasks: [] };
              groups.push(group);
            }
            group.tasks.push(t);
          });

          return (
            <div
              key={col.id}
              className="snap-center shrink-0 flex flex-col w-[80vw] sm:w-[310px] max-w-[340px] bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-3 border border-slate-200/70 dark:border-slate-800/70 shadow-xs"
            >
              {/* Member Column Header */}
              <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
                <div className="flex items-center gap-2 min-w-0">
                  {col.isUnassigned ? (
                    <div className="w-6 h-6 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-xs text-slate-400 font-bold shrink-0">
                      -
                    </div>
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: col.avatarColor }}
                    >
                      {col.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {col.name}
                  </span>
                </div>

                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks with Date Dividers */}
              <div className="flex-1 min-h-[300px] max-h-[72vh] overflow-y-auto no-scrollbar pt-3 space-y-3">
                {colTasks.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                    <Inbox className="w-6 h-6 mb-1.5 opacity-40" />
                    <span className="text-xs">暂无记录</span>
                  </div>
                ) : (
                  groups.map((group) => {
                    const isCopied = copiedDateKey === `${col.name}-${group.key}`;

                    return (
                      <div key={group.key} className="space-y-1.5">
                        {/* Interactive Date Divider with Copy Feature */}
                        <div
                          onClick={(e) => handleCopyDateGroup(col.name, group, e)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCopyDateGroup(col.name, group);
                            }
                          }}
                          title={`点击复制「${col.name} · ${group.label}」归档任务清单`}
                          className="group/divider flex items-center gap-2 px-1.5 py-1.5 rounded-xl cursor-pointer select-none transition-all duration-150 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover/divider:text-slate-700 dark:group-hover/divider:text-slate-200 transition-colors shrink-0">
                            <Calendar className="w-3 h-3 text-slate-400 group-hover/divider:text-indigo-500 dark:group-hover/divider:text-indigo-400 transition-colors" />
                            <span>{group.label}</span>
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {group.tasks.length}
                            </span>
                          </div>

                          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80 group-hover/divider:bg-indigo-300/80 dark:group-hover/divider:bg-indigo-600/80 transition-colors" />

                          {/* Copy Action Badge */}
                          <div
                            className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-150 shrink-0 ${
                              isCopied
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300 scale-110'
                                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/70 text-slate-400 group-hover/divider:text-indigo-600 dark:group-hover/divider:text-indigo-400 group-hover/divider:border-indigo-200 dark:group-hover/divider:border-indigo-800 group-hover/divider:bg-white dark:group-hover/divider:bg-slate-800 shadow-2xs'
                            }`}
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-500 animate-in zoom-in-50 duration-150" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </div>
                        </div>

                      {/* Task Cards in this Date Group */}
                      {group.tasks.map((task) => {
                        const checklistTotal = task.checklist ? task.checklist.length : 0;
                        const checklistDone = task.checklist
                          ? task.checklist.filter((i) => i.completed).length
                          : 0;

                        return (
                          <div
                            key={task.id}
                            className="group p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-600"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug line-through opacity-85">
                                    {task.title}
                                  </h4>
                                  {task.description && (
                                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                                      {task.description}
                                    </p>
                                  )}
                                  {checklistTotal > 0 && (
                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                      <CheckSquare className="w-3 h-3 text-emerald-500" />
                                      <span>
                                        {checklistDone}/{checklistTotal}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => handleUnarchive(task.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                                  title="恢复至看板"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="彻底删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};
