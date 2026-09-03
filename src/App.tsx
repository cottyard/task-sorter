import { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trash2, Archive } from 'lucide-react';
import { BoardData, Task, Member, Column, LanIp } from './types';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { ArchiveView } from './components/ArchiveView';
import { TaskModal } from './components/TaskModal';
import { MemberModal } from './components/MemberModal';

export function App() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lanIps, setLanIps] = useState<LanIp[]>([]);
  const [serverPort, setServerPort] = useState<number>(80);
  const [loading, setLoading] = useState<boolean>(true);

  // View state: 'board' or 'archive'
  const [currentView, setCurrentView] = useState<'board' | 'archive'>('board');
  const [archivedCount, setArchivedCount] = useState<number>(0);

  // Dragging state & Auto-scroll refs
  const [isDragging, setIsDragging] = useState(false);
  const isAutoScrollingRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const touchXRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Undo Toast state
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type: 'delete' | 'archive';
    onUndo?: () => void;
  } | null>(null);
  const toastTimerRef = useRef<any>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddColumnId, setQuickAddColumnId] = useState<string>('short');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // Dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem('tasksorter_theme') === 'dark' ||
      (!('tasksorter_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tasksorter_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tasksorter_theme', 'light');
    }
  }, [isDark]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('API request failed');
        const data: BoardData = await res.json();

        // Ensure no duplicate columns
        const colMap = new Map<string, Column>();
        (data.columns || []).forEach((c) => colMap.set(c.id, c));
        setColumns(Array.from(colMap.values()));

        setMembers(data.members || []);
        setTasks(data.tasks || []);
        setLanIps(data.lanIps || []);
        setServerPort(data.serverPort || 80);

        // Fetch initial archived count
        fetch('/api/tasks/archived')
          .then((r) => r.json())
          .then((d) => setArchivedCount(Array.isArray(d) ? d.length : 0))
          .catch(() => {});
      } catch (err) {
        console.error('Failed to load board data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Socket.IO Real-time Sync
  useEffect(() => {
    const socket: Socket = io();

    socket.on('task:created', (newTask: Task) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
    });

    socket.on('task:updated', (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    });

    socket.on('task:deleted', (deletedTaskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
    });

    socket.on('task:archived', (archivedTask: Task) => {
      setTasks((prev) => prev.filter((t) => t.id !== archivedTask.id));
      setArchivedCount((c) => c + 1);
    });

    socket.on('task:unarchived', (unarchivedTask: Task) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === unarchivedTask.id)) return prev;
        return [unarchivedTask, ...prev];
      });
      setArchivedCount((c) => Math.max(0, c - 1));
    });

    socket.on(
      'tasks:reordered',
      (updates: { id: string; columnId: string; order: number }[]) => {
        setTasks((prev) => {
          const map = new Map(updates.map((u) => [u.id, u]));
          return prev.map((t) => {
            if (map.has(t.id)) {
              const u = map.get(t.id)!;
              return { ...t, columnId: u.columnId, order: u.order };
            }
            return t;
          });
        });
      }
    );

    socket.on('columns:updated', (updatedColumns: Column[]) => {
      const map = new Map<string, Column>();
      updatedColumns.forEach((c) => map.set(c.id, c));
      setColumns(Array.from(map.values()));
    });

    socket.on('tasks:deleted_all_for_column', (columnId: string) => {
      setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
    });

    socket.on('members:updated', (updatedMembers: Member[]) => {
      setMembers(updatedMembers);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select';

      if (isInputActive) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTask(null);
        setQuickAddColumnId(columns[0]?.id || 'short');
        setIsTaskModalOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [columns]);

  // Mobile edge touch auto-scroll loop
  const startAutoScroll = () => {
    if (isAutoScrollingRef.current) return;
    isAutoScrollingRef.current = true;

    const loop = () => {
      if (!isAutoScrollingRef.current) return;

      if (boardRef.current && touchXRef.current !== null) {
        const x = touchXRef.current;
        const screenWidth = window.innerWidth;
        const edgeThreshold = 75;

        if (x > screenWidth - edgeThreshold) {
          const intensity = Math.min(1, (x - (screenWidth - edgeThreshold)) / edgeThreshold);
          const speed = Math.max(4, Math.round(intensity * 16));
          boardRef.current.scrollLeft += speed;
        } else if (x < edgeThreshold) {
          const intensity = Math.min(1, (edgeThreshold - x) / edgeThreshold);
          const speed = Math.max(4, Math.round(intensity * 16));
          boardRef.current.scrollLeft -= speed;
        }
      }
      scrollAnimRef.current = requestAnimationFrame(loop);
    };

    scrollAnimRef.current = requestAnimationFrame(loop);
  };

  const stopAutoScroll = () => {
    isAutoScrollingRef.current = false;
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
    touchXRef.current = null;
  };

  const handleDragStart = () => {
    setIsDragging(true);
    startAutoScroll();

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        touchXRef.current = e.touches[0].clientX;
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      touchXRef.current = e.clientX;
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    cleanupRef.current = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleMouseMove);
      stopAutoScroll();
    };
  };

  const handleDragEnd = (result: DropResult) => {
    try {
      setIsDragging(false);
      stopAutoScroll();
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const { destination, draggableId } = result;
      if (!destination) return;

      // Drop on Top-Left Trash Zone!
      if (destination.droppableId === 'trash-zone') {
        confetti({
          particleCount: 22,
          spread: 45,
          origin: { x: 0.25, y: 0.06 },
          colors: ['#f43f5e', '#fb7185', '#cbd5e1'],
        });
        handleDeleteTask(draggableId);
        return;
      }

      // Drop on Top-Right Archive Zone!
      if (destination.droppableId === 'archive-zone') {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { x: 0.75, y: 0.06 },
          colors: ['#10b981', '#34d399', '#6ee7b7'],
        });
        handleArchiveTask(draggableId);
        return;
      }

      const sourceColId = result.source.droppableId;
      const destColId = destination.droppableId;

      if (
        sourceColId === destColId &&
        result.source.index === destination.index
      ) {
        return;
      }

      const movedTask = tasks.find((t) => t.id === draggableId);
      if (!movedTask) return;

      const sourceColTasks = tasks
        .filter((t) => t.columnId === sourceColId)
        .sort((a, b) => a.order - b.order);

      const destColTasks =
        sourceColId === destColId
          ? sourceColTasks
          : tasks.filter((t) => t.columnId === destColId).sort((a, b) => a.order - b.order);

      const updates: { id: string; columnId: string; order: number }[] = [];

      if (sourceColId === destColId) {
        const reordered = sourceColTasks.filter((t) => t.id !== draggableId);
        reordered.splice(destination.index, 0, movedTask);
        reordered.forEach((task, idx) => {
          updates.push({ id: task.id, columnId: sourceColId, order: idx });
        });
      } else {
        const newSourceList = sourceColTasks.filter((t) => t.id !== draggableId);
        newSourceList.forEach((task, idx) => {
          updates.push({ id: task.id, columnId: sourceColId, order: idx });
        });

        const newDestList = destColTasks.filter((t) => t.id !== draggableId);
        newDestList.splice(destination.index, 0, {
          ...movedTask,
          columnId: destColId,
        });
        newDestList.forEach((task, idx) => {
          updates.push({ id: task.id, columnId: destColId, order: idx });
        });
      }

      handleReorderTasks(updates);
    } catch (err) {
      console.error('Error during drag end:', err);
    }
  };

  // Filter tasks based on search & member filter
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Member filter
      if (selectedMemberId === 'unassigned') {
        if (task.assigneeId) return false;
      } else if (selectedMemberId && task.assigneeId !== selectedMemberId) {
        return false;
      }

      // Search query filter (title & description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, selectedMemberId, searchQuery]);

  // Actions
  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (taskData.id) {
        const res = await fetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        const created = await res.json();
        setTasks((prev) => {
          if (prev.some((t) => t.id === created.id)) return prev;
          return [created, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    // Optimistic deletion
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // Show undo toast notification
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      id: taskId,
      message: `已移除「${taskToDelete.title}」`,
      type: 'delete',
      onUndo: async () => {
        setToast(null);
        setTasks((prev) => [taskToDelete, ...prev]);
        try {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskToDelete),
          });
        } catch (e) {
          console.error('Failed to restore task:', e);
        }
      },
    });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);

    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    const taskToArchive = tasks.find((t) => t.id === taskId);
    if (!taskToArchive) return;

    // Optimistic removal from active board
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // Show undo toast notification
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      id: taskId,
      message: `已归档「${taskToArchive.title}」`,
      type: 'archive',
      onUndo: async () => {
        setToast(null);
        setTasks((prev) => [taskToArchive, ...prev]);
        try {
          await fetch(`/api/tasks/${taskId}/unarchive`, { method: 'POST' });
        } catch (e) {
          console.error('Failed to undo archive:', e);
        }
      },
    });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);

    try {
      await fetch(`/api/tasks/${taskId}/archive`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to archive task:', err);
    }
  };

  const handleUnarchiveTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/unarchive`, { method: 'POST' });
      if (res.ok) {
        const restored: Task = await res.json();
        setTasks((prev) => {
          if (prev.some((t) => t.id === restored.id)) return prev;
          return [restored, ...prev];
        });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({
          id: taskId,
          message: `已恢复「${restored.title}」至看板`,
          type: 'archive',
        });
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to unarchive task:', err);
    }
  };

  const handleDeleteTaskPermanently = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to permanently delete task:', err);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const nextCompleted = !task.completed;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
      );
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
      });
    } catch (err) {
      console.error('Failed to toggle complete:', err);
    }
  };

  const handleReorderTasks = async (
    updates: { id: string; columnId: string; order: number }[]
  ) => {
    setTasks((prev) => {
      const map = new Map(updates.map((u) => [u.id, u]));
      return prev.map((t) => {
        if (map.has(t.id)) {
          const u = map.get(t.id)!;
          return { ...t, columnId: u.columnId, order: u.order };
        }
        return t;
      });
    });

    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
    }
  };

  // Column actions
  const handleAddColumn = async (title: string) => {
    try {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const newCol = await res.json();
      setColumns((prev) => {
        if (prev.some((c) => c.id === newCol.id)) return prev;
        return [...prev, newCol];
      });
    } catch (err) {
      console.error('Failed to add column:', err);
    }
  };

  const handleUpdateColumnTitle = async (columnId: string, title: string) => {
    try {
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, title } : c))
      );
      await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error('Failed to update column:', err);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
      await fetch(`/api/columns/${columnId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete column:', err);
    }
  };

  const handleSaveMembers = async (updatedMembers: Member[]) => {
    try {
      setMembers(updatedMembers);
      await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: updatedMembers }),
      });
    } catch (err) {
      console.error('Failed to save members:', err);
    }
  };

  const handleQuickAdd = (columnId: string) => {
    setEditingTask(null);
    setQuickAddColumnId(columnId);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-3" />
        <p className="text-xs">载入中...</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors relative">
        {/* Top Header with Dual Floating Drop Capsules & Archive Switcher */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          members={members}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
          tasks={tasks}
          lanIps={lanIps}
          serverPort={serverPort}
          isDark={isDark}
          isDragging={isDragging}
          currentView={currentView}
          archivedCount={archivedCount}
          onToggleDark={() => setIsDark(!isDark)}
          onOpenMemberModal={() => setIsMemberModalOpen(true)}
          onToggleView={setCurrentView}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 max-w-[1680px] w-full mx-auto px-2 sm:px-5 flex flex-col pt-3">
          {currentView === 'board' ? (
            <div className="flex-1">
              <Board
                columns={columns}
                tasks={filteredTasks}
                members={members}
                boardRef={boardRef}
                isDragging={isDragging}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
                onQuickAddTask={handleQuickAdd}
                onAddColumn={handleAddColumn}
                onUpdateColumnTitle={handleUpdateColumnTitle}
                onDeleteColumn={handleDeleteColumn}
              />
            </div>
          ) : (
            <ArchiveView
              members={members}
              onUnarchiveTask={handleUnarchiveTask}
              onDeleteTaskPermanently={handleDeleteTaskPermanently}
              onArchivedCountChange={setArchivedCount}
            />
          )}
        </main>

        {/* Floating Undo Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md text-xs border border-white/10 dark:border-black/10 select-none"
            >
              {toast.type === 'archive' ? (
                <Archive className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-400 dark:text-rose-500 shrink-0" />
              )}
              <span className="font-medium truncate max-w-[180px] sm:max-w-xs">{toast.message}</span>
              {toast.onUndo && (
                <button
                  onClick={toast.onUndo}
                  className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs active:scale-95 transition-all shrink-0"
                >
                  撤销
                </button>
              )}
              <button
                onClick={() => setToast(null)}
                className="p-0.5 text-slate-400 hover:text-white dark:hover:text-slate-900 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={handleSaveTask}
          task={editingTask}
          members={members}
          initialColumnId={quickAddColumnId}
          onDelete={handleDeleteTask}
        />

        <MemberModal
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
          members={members}
          onSaveMembers={handleSaveMembers}
        />
      </div>
    </DragDropContext>
  );
}

export default App;
