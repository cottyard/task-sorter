import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Column as ColumnType, Task, Member } from '../types';
import { Column } from './Column';
import { Plus, Check, X, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

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
  const [isPanningState, setIsPanningState] = useState(false);

  // Mouse drag-to-pan refs
  const isPanningRef = useRef(false);
  const startPosRef = useRef({ x: 0, scrollLeft: 0 });
  const hasMovedRef = useRef(false);

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

  // Mouse left-click drag to pan (grab scroll)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    const target = e.target as HTMLElement;

    // Ignore if clicked on a draggable card or interactive element
    if (
      target.closest('[data-rfd-draggable-id]') ||
      target.closest('button, input, textarea, a, select, [role="button"]')
    ) {
      return;
    }

    const el = boardRef.current;
    if (!el) return;

    isPanningRef.current = true;
    hasMovedRef.current = false;
    startPosRef.current = {
      x: e.pageX,
      scrollLeft: el.scrollLeft,
    };
    setIsPanningState(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const el = boardRef.current;
      if (!el) return;

      const dx = e.pageX - startPosRef.current.x;
      if (Math.abs(dx) > 4) {
        hasMovedRef.current = true;
      }
      el.scrollLeft = startPosRef.current.scrollLeft - dx;
    };

    const handleMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanningState(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [boardRef]);

  // Suppress accidental clicks if mouse dragged
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMovedRef.current = false;
    }
  };

  const scrollByAmount = (amount: number) => {
    boardRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const scrollToColumnIndex = (index: number) => {
    const el = boardRef.current;
    if (!el) return;
    const colEl = el.children[index] as HTMLElement | undefined;
    if (colEl) {
      const targetLeft = colEl.offsetLeft - 16;
      el.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
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
    <div className="relative w-full min-w-0 group/board flex flex-col">
      {/* Swimlane Overview Tracker Header (when 4+ columns exist) */}
      {columns.length >= 4 && (
        <div className="flex items-center justify-between pb-2 px-1 text-xs select-none">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
            <Layers className="w-3 h-3 text-indigo-500/80" />
            <span>共 {columns.length} 个泳道</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="hidden sm:inline">可鼠标滚轮或按住空白处拖拽平移</span>
          </div>

          {/* Quick Swimlane Navigator Pills */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xs">
            {columns.map((col, idx) => {
              const colTasks = tasks.filter((t) => t.columnId === col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => scrollToColumnIndex(idx)}
                  className="group/pill flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  title={`定位到「${col.title}」(${colTasks.length} 项)`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 group-hover/pill:bg-indigo-500 transition-colors" />
                  <span className="max-w-[75px] truncate">{col.title}</span>
                  <span className="text-[10px] opacity-60 font-mono">({colTasks.length})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Board Viewport Area with Ambient Edge Fade Masks */}
      <div className="relative w-full min-w-0">
        {/* Ambient Left Edge Fade Mask */}
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 via-slate-50/80 dark:via-slate-950/80 to-transparent z-20 transition-opacity duration-300 ${
            canScrollLeft && !isDragging ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Ambient Right Edge Fade Mask */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-20 sm:w-28 bg-gradient-to-l from-slate-50 dark:from-slate-950 via-slate-50/80 dark:via-slate-950/80 to-transparent z-20 transition-opacity duration-300 ${
            canScrollRight && !isDragging ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Left Floating Overflow Glass Capsule */}
        {canScrollLeft && !isDragging && (
          <button
            type="button"
            onClick={() => scrollByAmount(-360)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none group"
            title="向左平移泳道 (或鼠标滚轮/按住左键拖拽)"
          >
            <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            </div>
            <span className="hidden sm:inline text-[11px]">左侧泳道</span>
          </button>
        )}

        {/* Right Floating Overflow Glass Capsule */}
        {canScrollRight && !isDragging && (
          <button
            type="button"
            onClick={() => scrollByAmount(360)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none group"
            title="向右平移泳道 (或鼠标滚轮/按住左键拖拽)"
          >
            <span className="hidden sm:inline text-[11px]">更多泳道</span>
            <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        )}

        {/* Horizontal Scrollable Lane Container (No visible scrollbar) */}
        <div
          ref={boardRef}
          onMouseDown={handleMouseDown}
          onClickCapture={handleClickCapture}
          className={`w-full flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar items-start ${
            isPanningState ? 'cursor-grabbing select-none' : 'cursor-grab'
          } ${isDragging ? 'snap-none' : 'snap-x snap-mandatory sm:snap-none'}`}
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
                className="w-10 h-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white/50 dark:hover:bg-slate-900/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                title="新建泳道"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
