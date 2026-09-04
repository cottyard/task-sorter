import { Task, Member } from '../types';

export interface FormatTasksOptions {
  title?: string;
  tasks: Task[];
  members: Member[];
  subTitle?: string;
}

/**
 * Formats a list of tasks into a concise, clean Pretty Print string.
 * Keeps only the content between dividers, removing all redundant labels,
 * checkboxes, checklist headers, and headers/footers.
 */
export function formatTasksPrettyPrint(options: FormatTasksOptions): string {
  const { tasks, members } = options;
  if (!tasks || tasks.length === 0) {
    return '';
  }

  const lines: string[] = [];

  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Helper to format a single task
  const renderTask = (task: Task, index: number) => {
    lines.push(`${index + 1}. ${task.title}`);

    // Description (indented without label)
    if (task.description && task.description.trim()) {
      const descLines = task.description.trim().split('\n');
      descLines.forEach((line) => {
        lines.push(`   ${line}`);
      });
    }

    // Subtasks / Checklist (indented directly with - bullet)
    if (task.checklist && task.checklist.length > 0) {
      task.checklist.forEach((item) => {
        lines.push(`   - ${item.text}`);
      });
    }

    lines.push(''); // Blank line after each task
  };

  // Group by assignee (always keeping assignee name at the top)
  members.forEach((member) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
    if (memberTasks.length > 0) {
      lines.push(member.name);
      memberTasks.forEach((task, idx) => {
        renderTask(task, idx);
      });
    }
  });

  // Handle tasks with unknown or empty assigneeId
  const unassignedTasks = tasks.filter((t) => !t.assigneeId || !memberMap.has(t.assigneeId));
  if (unassignedTasks.length > 0) {
    lines.push('未指定负责人');
    unassignedTasks.forEach((task, idx) => {
      renderTask(task, idx);
    });
  }

  return lines.join('\n').trim();
}

/**
 * Copies plain text to clipboard safely across modern secure context (localhost/HTTPS)
 * and insecure LAN context (HTTP IP).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed, trying execCommand fallback...', e);
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
