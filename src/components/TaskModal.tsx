import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Member, ChecklistItem } from '../types';
import { X, Plus, Trash2, CheckSquare, Clock, Check, GripVertical } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  task?: Task | null;
  members: Member[];
  initialColumnId?: string;
  onDelete?: (taskId: string) => void;
}

function getElapsedTime(createdAtStr?: string) {
  if (!createdAtStr) return '';
  const created = new Date(createdAtStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const formattedDate = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(
    created.getDate()
  ).padStart(2, '0')} ${String(created.getHours()).padStart(2, '0')}:${String(
    created.getMinutes()
  ).padStart(2, '0')}`;

  let elapsed = '';
  if (diffDays > 0) {
    elapsed = `已创建 ${diffDays} 天`;
  } else if (diffHours > 0) {
    elapsed = `已创建 ${diffHours} 小时`;
  } else if (diffMinutes > 0) {
    elapsed = `已创建 ${diffMinutes} 分钟`;
  } else {
    elapsed = '刚刚创建';
  }

  return `${formattedDate} · ${elapsed}`;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  task,
  members,
  initialColumnId,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('short');
  const [assigneeId, setAssigneeId] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [draggingChecklistIndex, setDraggingChecklistIndex] = useState<number | null>(null);
  const draggingChecklistIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setIsConfirmingDelete(false);
    setEditingChecklistId(null);
    setDraggingChecklistIndex(null);
    draggingChecklistIndexRef.current = null;
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setColumnId(task.columnId || 'short');
      setAssigneeId(task.assigneeId || '');
      setChecklist(task.checklist || []);
    } else {
      setTitle('');
      setDescription('');
      setColumnId(initialColumnId || 'short');
      setAssigneeId('');
      setChecklist([]);
    }
  }, [task, initialColumnId, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(task ? { id: task.id } : {}),
      title: title.trim(),
      description: description.trim(),
      columnId,
      assigneeId,
      checklist,
    });
    onClose();
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistText.trim();
    if (trimmed) {
      setChecklist([
        ...checklist,
        { id: `c-${Date.now()}`, text: trimmed, completed: false },
      ]);
      setNewChecklistText('');
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
    if (editingChecklistId === id) {
      setEditingChecklistId(null);
      setEditingChecklistText('');
    }
  };

  // --- Checklist item inline editing ---
  const handleStartEditChecklistItem = (item: ChecklistItem) => {
    setEditingChecklistId(item.id);
    setEditingChecklistText(item.text);
  };

  const handleFinishEditChecklistItem = () => {
    if (editingChecklistId === null) return;
    const trimmed = editingChecklistText.trim();
    if (trimmed) {
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === editingChecklistId ? { ...item, text: trimmed } : item
        )
      );
    }
    setEditingChecklistId(null);
    setEditingChecklistText('');
  };

  const handleCancelEditChecklistItem = () => {
    setEditingChecklistId(null);
    setEditingChecklistText('');
  };

  const handleEditChecklistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleFinishEditChecklistItem();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelEditChecklistItem();
    }
  };

  // --- Checklist item drag reorder ---
  const handleChecklistDragStart = (e: React.DragEvent, index: number) => {
    draggingChecklistIndexRef.current = index;
    setDraggingChecklistIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleChecklistDragEnter = (index: number) => {
    const from = draggingChecklistIndexRef.current;
    if (from === null || from === index) return;
    setChecklist((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    draggingChecklistIndexRef.current = index;
    setDraggingChecklistIndex(index);
  };

  const handleChecklistDragEnd = () => {
    draggingChecklistIndexRef.current = null;
    setDraggingChecklistIndex(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.05 }}
            onKeyDown={handleKeyDown}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-6"
          >
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                {task && task.createdAt ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{getElapsedTime(task.createdAt)}</span>
                  </div>
                ) : null}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* Title input */}
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="任务标题..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Assignee selection as pure circular avatar buttons */}
              <div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-1">
                  {/* Unassigned button */}
                  <button
                    type="button"
                    onClick={() => setAssigneeId('')}
                    className={`w-7 h-7 rounded-full border border-dashed flex items-center justify-center text-xs shrink-0 transition-all active:scale-95 ${
                      assigneeId === ''
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300 scale-110'
                        : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:border-slate-400'
                    }`}
                    title="未指定负责人"
                  >
                    {assigneeId === '' ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      '-'
                    )}
                  </button>

                  {/* Member circular buttons */}
                  {members.map((m) => {
                    const isSelected = assigneeId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAssigneeId(m.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 transition-all active:scale-95 ${
                          isSelected
                            ? 'scale-110 shadow-sm'
                            : 'opacity-65 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: m.avatarColor }}
                        title={m.name}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          m.name.charAt(0)
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="任务内容说明..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              {/* Checklist / Sub-tasks */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                    子清单 ({checklist.filter((i) => i.completed).length}/{checklist.length})
                  </span>
                </div>
                <div className="space-y-1 mb-2">
                  {checklist.map((item, index) => {
                    const isEditing = editingChecklistId === item.id;
                    const isDragging = draggingChecklistIndex === index;
                    return (
                      <div
                        key={item.id}
                        draggable={!isEditing}
                        onDragStart={(e) => handleChecklistDragStart(e, index)}
                        onDragEnter={() => handleChecklistDragEnter(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => e.preventDefault()}
                        onDragEnd={handleChecklistDragEnd}
                        className={`flex items-center p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border text-xs transition-opacity ${
                          isDragging
                            ? 'opacity-40 border-indigo-400 dark:border-indigo-500'
                            : 'border-slate-200/60 dark:border-slate-700/60'
                        }`}
                      >
                        <GripVertical
                          className={`w-3 h-3 shrink-0 mr-1 transition-colors ${
                            isDragging
                              ? 'text-indigo-400'
                              : 'text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing'
                          }`}
                        />
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklistItem(item.id)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                        />
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingChecklistText}
                            onChange={(e) => setEditingChecklistText(e.target.value)}
                            onKeyDown={handleEditChecklistKeyDown}
                            onBlur={handleFinishEditChecklistItem}
                            className="flex-1 mx-2 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-500 focus:outline-none text-slate-800 dark:text-white"
                          />
                        ) : (
                          <span
                            onClick={() => handleStartEditChecklistItem(item)}
                            title="单击编辑，拖动左侧手柄调整顺序"
                            className={`flex-1 mx-2 cursor-text rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors ${
                              item.completed
                                ? 'line-through text-slate-400'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {item.text}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add Checklist item input */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="输入子项并回车..."
                    className="flex-1 px-3 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                    title="添加子项"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Modal Footer actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {task && onDelete && (
                    <>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(task.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                          >
                            确定删除
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(false)}
                            className="px-2 py-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(true)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="删除任务"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 active:scale-95 transition-all"
                  >
                    保存
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
