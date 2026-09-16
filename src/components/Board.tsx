import React, { useState, useEffect, useCallback } from 'react';
import { Column as ColumnType, Task, Member } from '../types';
import { Column } from './Column';
import { Plus, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  onArchiveTasks: (taskIds: string[]) => void;
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
  onArchiveTasks,
}) => {
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 15);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 15);
  }, [boardRef]);

  // Monitor scroll position and resize
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [boardRef, checkScroll, columns.length, tasks.length]);

  // Smooth mouse wheel horizontal scrolling on PC
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If user is already scrolling horizontally (trackpad / shift key)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      // Check if mouse is over a vertically scrollable element inside a column that can still scroll vertically
      let target = e.target as HTMLElement | null;
      let isInsideScrollableChild = false;

      while (target && target !== el) {
        if (target.scrollHeight > target.clientHeight) {
          const style = window.getComputedStyle(target);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            const canScrollUp = target.scrollTop > 0 && e.deltaY < 0;
            const canScrollDown =
              target.scrollTop + target.clientHeight < target.scrollHeight - 1 &&
              e.deltaY > 0;

            if (canScrollUp || canScrollDown) {
              isInsideScrollableChild = true;
              break;
            }
          }
        }
        target = target.parentElement;
      }

      if (isInsideScrollableChild) {
        return;
      }

      // If the board has horizontal overflow, convert vertical wheel scroll to horizontal scroll
      if (el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [boardRef]);

  const scrollByAmount = (amount: number) => {
    boardRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

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
    <div className="relative w-full min-w-0 group/board">
      {/* Scroll Left Button */}
      {canScrollLeft && !isDragging && (
        <button
          type="button"
          onClick={() => scrollByAmount(-350)}
          className="hidden sm:flex absolute left-0 top-24 z-30 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="向左滚动泳道"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && !isDragging && (
        <button
          type="button"
          onClick={() => scrollByAmount(350)}
          className="hidden sm:flex absolute right-0 top-24 z-30 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="向右滚动泳道"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={boardRef}
        className={`w-full flex gap-3 sm:gap-4 overflow-x-auto pb-6 pt-1 px-1 board-scrollbar items-start ${
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
              onArchiveTasks={onArchiveTasks}
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
  </div>
  );
};
