import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, Member } from '../types';
import { CheckSquare, CheckCircle2, Circle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  task: Task;
  index: number;
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  members,
  onEdit,
  onToggleComplete,
}) => {
  const assignee = members.find((m) => m.id === task.assigneeId);

  // Calculate checklist progress
  const checklistTotal = task.checklist ? task.checklist.length : 0;
  const checklistDone = task.checklist ? task.checklist.filter((i) => i.completed).length : 0;
  const checklistPercent = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
        colors: ['#6366f1', '#ec4899', '#22c55e', '#eab308'],
      });
    }
    onToggleComplete(task);
  };

  // Ultra-compact single-row design for completed tasks
  if (task.completed) {
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onEdit(task)}
            className={`group relative mb-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between gap-2 select-none cursor-grab active:cursor-grabbing transition-all ${
              snapshot.isDragging ? 'is-dragging shadow-lg' : ''
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={handleCheckboxClick}
                className="text-emerald-500 hover:text-slate-400 dark:hover:text-slate-500 transition-colors shrink-0"
                title="标记为未完成"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500 line-through truncate font-normal">
                {task.title}
              </span>
            </div>

            {assignee && (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white opacity-80 shrink-0"
                style={{ backgroundColor: assignee.avatarColor }}
                title={assignee.name}
              >
                {assignee.name.charAt(0)}
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  }

  // Normal active task card: Avatar located directly under the checkbox, no bottom footer, no hover buttons
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(task)}
          className={`group relative mb-2 p-2.5 rounded-2xl bg-white dark:bg-slate-800/95 border transition-all duration-150 select-none cursor-grab active:cursor-grabbing flex items-start gap-2.5 ${
            snapshot.isDragging
              ? 'is-dragging shadow-2xl border-indigo-400 dark:border-indigo-500 bg-white/95 dark:bg-slate-800/95 ring-2 ring-indigo-500/20'
              : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm hover:shadow-card-hover hover:-translate-y-0.5'
          }`}
        >
          {/* Left Column: Checkbox on top, Avatar directly underneath */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
            <button
              onClick={handleCheckboxClick}
              className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
              title="标记为已完成"
            >
              <Circle className="w-4 h-4" />
            </button>

            {assignee && (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-xs shrink-0"
                style={{ backgroundColor: assignee.avatarColor }}
                title={assignee.name}
              >
                {assignee.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Right Column: Title, Description, Checklist */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold leading-snug tracking-tight text-slate-800 dark:text-slate-100">
              {task.title}
            </h3>

            {task.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1 font-normal">
                {task.description}
              </p>
            )}

            {checklistTotal > 0 && (
              <div className="mt-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-indigo-500" />
                    清单 ({checklistDone}/{checklistTotal})
                  </span>
                  <span className="font-mono font-semibold">
                    {Math.round(checklistPercent)}%
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      checklistPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
