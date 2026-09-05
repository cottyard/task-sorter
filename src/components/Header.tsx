import React, { useState } from 'react';
import { Search, Moon, Sun, Wifi, Copy, Check, Users, Trash2, Archive } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';
import { LanIp, Member, Task } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  members: Member[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  tasks: Task[];
  lanIps: LanIp[];
  serverPort: number;
  isDark: boolean;
  isDragging: boolean;
  currentView: 'board' | 'archive';
  archivedCount: number;
  onToggleDark: () => void;
  onOpenMemberModal: () => void;
  onToggleView: (view: 'board' | 'archive') => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  members,
  selectedMemberId,
  onSelectMember,
  tasks,
  lanIps,
  serverPort,
  isDark,
  isDragging,
  currentView,
  archivedCount,
  onToggleDark,
  onOpenMemberModal,
  onToggleView,
}) => {
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIp(url);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const primaryLanIp = lanIps.find((ip) => !ip.address.startsWith('169.254')) || lanIps[0];
  const portPart = serverPort === 80 ? '' : `:${serverPort}`;
  const lanUrl = primaryLanIp ? `http://${primaryLanIp.address}${portPart}` : `http://localhost${portPart}`;

  // Member task counts
  const getMemberTaskCount = (memberId: string) => {
    return tasks.filter((t) => t.assigneeId === memberId && !t.completed).length;
  };
  const unassignedCount = tasks.filter((t) => !t.assigneeId && !t.completed).length;
  const activeTotal = tasks.filter((t) => !t.completed).length;

  // Reusable member pills renderer (Pure circular avatars)
  const renderMemberAvatars = () => (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5">
      {/* All Tasks Pill */}
      <button
        onClick={() => onSelectMember(null)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
          selectedMemberId === null
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60'
        }`}
      >
        <span>全部</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            selectedMemberId === null
              ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
          }`}
        >
          {activeTotal}
        </span>
      </button>

      {/* Pure Circular Member Avatars */}
      {members.map((member) => {
        const count = getMemberTaskCount(member.id);
        const isSelected = selectedMemberId === member.id;

        return (
          <div key={member.id} className="relative shrink-0">
            <button
              onClick={() => onSelectMember(isSelected ? null : member.id)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs transition-all active:scale-95 ${
                isSelected
                  ? 'scale-110 shadow-sm'
                  : 'opacity-75 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: member.avatarColor }}
              title={member.name}
            >
              {isSelected ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                member.name.charAt(0)
              )}
            </button>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-[8px] font-bold flex items-center justify-center pointer-events-none shadow-xs">
                {count}
              </span>
            )}
          </div>
        );
      })}

      {/* Unassigned button as circular dashed */}
      {unassignedCount > 0 && (
        <div className="relative shrink-0">
          <button
            onClick={() => onSelectMember(selectedMemberId === 'unassigned' ? null : 'unassigned')}
            className={`w-7 h-7 rounded-full border border-dashed flex items-center justify-center text-xs font-medium transition-all active:scale-95 ${
              selectedMemberId === 'unassigned'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300 scale-110'
                : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:border-slate-400'
            }`}
            title="未分配任务"
          >
            {selectedMemberId === 'unassigned' ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              '-'
            )}
          </button>
          <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-slate-500 text-white text-[8px] font-bold flex items-center justify-center pointer-events-none shadow-xs">
            {unassignedCount}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors relative">
      {/* Dual Floating Capsules: Top-Left Delete, Top-Right Archive */}
      <div
        className={`absolute inset-0 z-40 max-w-[1680px] mx-auto px-2 sm:px-4 flex items-center justify-between gap-2.5 transition-all duration-200 ${
          isDragging
            ? 'opacity-100 pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left Capsule: Trash Drop Zone */}
        <div className="flex-1 h-9 sm:h-10">
          <Droppable droppableId="trash-zone" isDropDisabled={!isDragging}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`w-full h-full rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 select-none ${
                  snapshot.isDraggingOver
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white scale-[1.02] shadow-xl shadow-rose-500/35 ring-2 ring-rose-400'
                    : 'bg-rose-50/95 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-dashed border-rose-300 dark:border-rose-800 shadow-xs'
                }`}
              >
                <Trash2
                  className={`w-4 h-4 transition-all duration-200 ${
                    snapshot.isDraggingOver ? 'scale-125 -rotate-12 stroke-[2.5]' : ''
                  }`}
                />
                <span className="text-xs font-bold tracking-tight">删除</span>
                <div className="hidden">{provided.placeholder}</div>
              </div>
            )}
          </Droppable>
        </div>

        {/* Right Capsule: Archive Drop Zone */}
        <div className="flex-1 h-9 sm:h-10">
          <Droppable droppableId="archive-zone" isDropDisabled={!isDragging}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`w-full h-full rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 select-none ${
                  snapshot.isDraggingOver
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white scale-[1.02] shadow-xl shadow-emerald-500/35 ring-2 ring-emerald-400'
                    : 'bg-emerald-50/95 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-dashed border-emerald-300 dark:border-emerald-800 shadow-xs'
                }`}
              >
                <Archive
                  className={`w-4 h-4 transition-all duration-200 ${
                    snapshot.isDraggingOver ? 'scale-125 rotate-12 stroke-[2.5]' : ''
                  }`}
                />
                <span className="text-xs font-bold tracking-tight">归档</span>
                <div className="hidden">{provided.placeholder}</div>
              </div>
            )}
          </Droppable>
        </div>
      </div>

      {/* Normal Header Content */}
      <div className={`transition-opacity duration-150 ${isDragging ? 'invisible' : 'visible'}`}>
        {/* Line 1: Main Header Row */}
        <div className="max-w-[1680px] mx-auto px-2.5 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-2 sm:gap-3">
          {/* Desktop: Member circular avatars inline on the left (only when in board view) */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 py-1">
            {currentView === 'board' ? (
              renderMemberAvatars()
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleView('board')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
                >
                  <span>← 看板</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">|</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  已归档 · {archivedCount}
                </span>
              </div>
            )}
          </div>

          {/* Mobile: View title or Search bar */}
          <div className="flex-1 sm:hidden">
            {currentView === 'archive' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleView('board')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  ← 看板
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  已归档 · {archivedCount}
                </span>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="搜索..."
                  className="w-full pl-7 pr-6 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Desktop Search Bar (only when in board view) */}
          {currentView === 'board' && (
            <div className="hidden sm:block w-36 md:w-52 shrink-0">
              <div className="relative group">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="搜索..."
                  className="w-full pl-7 pr-5 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right Action Icons (Wifi, Archive, Members, Theme) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Elongated Archive toggle button */}
            <button
              onClick={() => onToggleView(currentView === 'board' ? 'archive' : 'board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                currentView === 'archive'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title={currentView === 'archive' ? '返回看板' : '归档'}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>归档</span>
              {archivedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    currentView === 'archive'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {archivedCount}
                </span>
              )}
            </button>

            {/* LAN URL button */}
            <div className="relative">
              <button
                onClick={() => setShowNetworkModal(!showNetworkModal)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`局域网: ${lanUrl}`}
              >
                <Wifi className="w-4 h-4 text-emerald-500" />
              </button>

              {/* Network Dropdown */}
              {showNetworkModal && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">局域网协作地址</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">
                      80端口
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">
                      {lanUrl}
                    </span>
                    <button
                      onClick={() => copyToClipboard(lanUrl)}
                      className="ml-2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                      {copiedIp === lanUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Members manage button */}
            <button
              onClick={onOpenMemberModal}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="成员设置"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={onToggleDark}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="切换主题"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Line 2 (Mobile only): Dedicated full-width standalone member avatar row */}
        {currentView === 'board' && (
          <div className="sm:hidden px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
            {renderMemberAvatars()}
          </div>
        )}
      </div>
    </header>
  );
};
