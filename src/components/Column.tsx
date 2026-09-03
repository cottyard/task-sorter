import React, { useState, useRef, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task, Member } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, Edit2, Trash2, Check } from 'lucide-react';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  members: Member[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAddTask: (columnId: string) => void;
  onUpdateColumnTitle: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

const COLUMN_COLOR_THEMES: Record<
  string,
  { countBg: string; borderFocus: string }
> = {
  rose: {
    countBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300',
    borderFocus: 'border-rose-400',
  },
  amber: {
    countBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
    borderFocus: 'border-amber-400',
  },
  blue: {
    countBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
    borderFocus: 'border-blue-400',
  },
  emerald: {
    countBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
    borderFocus: 'border-emerald-400',
  },
  violet: {
    countBg: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300',
    borderFocus: 'border-violet-400',
  },
  sky: {
    countBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300',
    borderFocus: 'border-sky-400',
  },
};

export const Column: React.FC<ColumnProps> = ({
  column,
  tasks,
  members,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onQuickAddTask,
  onUpdateColumnTitle,
  onDeleteColumn,
}) => {
  const theme = COLUMN_COLOR_THEMES[column.badgeColor] || COLUMN_COLOR_THEMES.blue;
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Inline column title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(column.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleInput(column.title);
  }, [column.title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== column.title) {
      onUpdateColumnTitle(column.id, trimmed);
    } else {
      setTitleInput(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitleInput(column.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="group/col flex flex-col w-[80vw] sm:w-[310px] max-w-[340px] bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-3 border border-slate-200/70 dark:border-slate-800/70 transition-colors shadow-xs">
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                ref={inputRef}
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={handleTitleKeyDown}
                className="w-full px-2 py-0.5 text-sm font-bold rounded-lg bg-white dark:bg-slate-800 border border-indigo-500 focus:outline-none text-slate-900 dark:text-white"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSaveTitle}
                className="p-1 text-emerald-600 hover:bg-white rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title cursor-pointer min-w-0">
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate hover:text-indigo-600 transition-colors"
                title="点击编辑泳道名称"
              >
                {column.title}
              </h2>
              <span
                className={`text-[11px] font-semibold px-2 py-0.2 rounded-full shrink-0 ${theme.countBg}`}
              >
                {activeTasks.length}
              </span>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity p-0.5"
                title="重命名泳道"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Column Actions: Quick Add & Delete */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onQuickAddTask(column.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title="添加任务"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1 animate-in fade-in duration-150">
              <button
                onClick={() => onDeleteColumn(column.id)}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                title="确认删除泳道"
              >
                删除
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="p-0.5 text-slate-400 hover:text-slate-600 text-[10px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (tasks.length === 0) {
                  onDeleteColumn(column.id);
                } else {
                  setIsConfirmingDelete(true);
                }
              }}
              className="opacity-0 group-hover/col:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 transition-all"
              title="删除泳道"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-1 py-1 rounded-2xl min-h-[420px] transition-colors duration-150 ${
              snapshot.isDraggingOver
                ? 'is-dragging-over border-dashed border-2 border-indigo-400'
                : ''
            }`}
          >
            {/* Active tasks */}
            {activeTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                members={members}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={onToggleComplete}
              />
            ))}

            {/* Completed tasks section */}
            {completedTasks.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5 px-1 flex items-center justify-between">
                  <span>已完成 ({completedTasks.length})</span>
                </div>
                {completedTasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={activeTasks.length + index}
                    members={members}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </div>
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
