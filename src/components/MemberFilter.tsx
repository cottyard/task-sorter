import React from 'react';
import { Member, Task } from '../types';

interface MemberFilterProps {
  members: Member[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  tasks: Task[];
}

export const MemberFilter: React.FC<MemberFilterProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  tasks,
}) => {
  const getMemberTaskCount = (memberId: string) => {
    return tasks.filter((t) => t.assigneeId === memberId && !t.completed).length;
  };

  const unassignedCount = tasks.filter((t) => !t.assigneeId && !t.completed).length;
  const activeTotal = tasks.filter((t) => !t.completed).length;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 px-1 no-scrollbar select-none">
      {/* All filter button */}
      <button
        onClick={() => onSelectMember(null)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
          selectedMemberId === null
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80'
        }`}
      >
        <span>全部</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            selectedMemberId === null
              ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
          }`}
        >
          {activeTotal}
        </span>
      </button>

      {/* Individual member avatars */}
      {members.map((member) => {
        const count = getMemberTaskCount(member.id);
        const isSelected = selectedMemberId === member.id;

        return (
          <button
            key={member.id}
            onClick={() => onSelectMember(isSelected ? null : member.id)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
              isSelected
                ? 'ring-2 ring-indigo-500 bg-white dark:bg-slate-800 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: member.avatarColor }}
            >
              {member.name.charAt(0)}
            </div>
            <span className="truncate max-w-[65px]">{member.name}</span>
            {count > 0 && (
              <span
                className={`text-[10px] px-1 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}

      {unassignedCount > 0 && (
        <button
          onClick={() => onSelectMember(selectedMemberId === 'unassigned' ? null : 'unassigned')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
            selectedMemberId === 'unassigned'
              ? 'ring-2 ring-indigo-500 bg-white dark:bg-slate-800 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700/80'
          }`}
        >
          <span>未分配</span>
          <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400">
            {unassignedCount}
          </span>
        </button>
      )}
    </div>
  );
};
