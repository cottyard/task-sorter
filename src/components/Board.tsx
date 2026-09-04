import React, { useState } from 'react';
import { Column as ColumnType, Task, Member } from '../types';
import { Column } from './Column';
import { Plus, Check, X } from 'lucide-react';

interface BoardProps {
  columns: ColumnType[];
  tasks: Task[];
  members: Member[];
  boardRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAddTask: (columnId: string) => void;
  onAddColumn: (title: string) => void;
  onUpdateColumnTitle: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export const Board: React.FC<BoardProps> = ({
  columns,
  tasks,
  members,
  boardRef,
  isDragging,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onQuickAddTask,
  onAddColumn,
  onUpdateColumnTitle,
  onDeleteColumn,
}) => {
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateColumn = () => {
    const trimmed = newColTitle.trim();
    if (trimmed && !isSubmitting) {
      setIsSubmitting(true);
      onAddColumn(trimmed);
      setNewColTitle('');
      setIsAddingCol(false);
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  return (
    <div
      ref={boardRef}
      className={`flex gap-3 sm:gap-4 overflow-x-auto pb-6 pt-1 px-1 no-scrollbar items-start ${
        isDragging ? 'snap-none' : 'snap-x snap-mandatory sm:snap-none'
      }`}
    >
      {columns.map((column) => {
        const columnTasks = tasks
          .filter((t) => t.columnId === column.id)
          .sort((a, b) => a.order - b.order);

        return (
          <div key={column.id} className="snap-center shrink-0">
            <Column
              column={column}
              tasks={columnTasks}
              members={members}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onToggleComplete={onToggleComplete}
              onQuickAddTask={onQuickAddTask}
              onUpdateColumnTitle={onUpdateColumnTitle}
              onDeleteColumn={onDeleteColumn}
            />
          </div>
        );
      })}

      {/* Add Column Button / Form */}
      <div className="shrink-0 pt-1 snap-center">
        {isAddingCol ? (
          <div className="w-56 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500 shadow-md">
            <input
              type="text"
              autoFocus
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateColumn();
                if (e.key === 'Escape') setIsAddingCol(false);
              }}
              placeholder="泳道名称..."
              className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white mb-2"
            />
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => setIsAddingCol(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCreateColumn}
                disabled={isSubmitting}
                className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCol(true)}
            className="w-10 h-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white/50 dark:hover:bg-slate-900/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all shadow-xs"
            title="新建泳道"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
