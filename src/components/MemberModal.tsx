import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '../types';
import { X, Plus, Trash2, Check } from 'lucide-react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSaveMembers: (updatedMembers: Member[]) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  members,
  onSaveMembers,
}) => {
  const [localMembers, setLocalMembers] = useState<Member[]>([]);

  useEffect(() => {
    setLocalMembers(members.map((m) => ({ ...m })));
  }, [members, isOpen]);

  const handleChangeName = (id: string, name: string) => {
    setLocalMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m))
    );
  };

  const handleChangeColor = (id: string, color: string) => {
    setLocalMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, avatarColor: color } : m))
    );
  };

  const handleAddMember = () => {
    const nextIdx = localMembers.length;
    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: '',
      avatarColor: PRESET_COLORS[nextIdx % PRESET_COLORS.length],
    };
    setLocalMembers([...localMembers, newMember]);
  };

  const handleDeleteMember = (id: string) => {
    if (localMembers.length <= 1) return;
    setLocalMembers(localMembers.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    const cleaned = localMembers
      .map((m) => ({ ...m, name: m.name.trim() || '成员' }))
      .filter((m) => m.name);
    onSaveMembers(cleaned);
    onClose();
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

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.05 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
          >
            {/* Top Close Row (No redundant title, no blue dot) */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-end">
              <button
                onClick={onClose}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member List */}
            <div className="px-4 py-2 space-y-2.5 max-h-[58vh] overflow-y-auto overflow-x-hidden no-scrollbar">
              {localMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5 transition-colors"
                >
                  {/* Row 1: Avatar, Name Input, and Delete Button */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 transition-colors duration-200"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name ? member.name.charAt(0) : '?'}
                    </div>

                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => handleChangeName(member.id, e.target.value)}
                      placeholder="姓名..."
                      className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
                    />

                    {localMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors shrink-0"
                        title="删除成员"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Row 2: Curated Palette Dots with Active Checkmark */}
                  <div className="flex items-center justify-between pt-0.5 px-0.5">
                    {PRESET_COLORS.map((c) => {
                      const isSelected = member.avatarColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleChangeColor(member.id, c)}
                          className={`w-5 h-5 rounded-full transition-all flex items-center justify-center active:scale-90 ${
                            isSelected
                              ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-xs'
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {isSelected && (
                            <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Add Member Button */}
              <button
                type="button"
                onClick={handleAddMember}
                className="w-full py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-colors"
                title="添加成员"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
