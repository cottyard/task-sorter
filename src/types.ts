export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  assigneeId: string;
  order: number;
  checklist: ChecklistItem[];
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  archived?: boolean;
  archivedAt?: string;
}

export interface Member {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Column {
  id: string;
  title: string;
  badgeColor: string;
  accent?: string;
  icon?: string;
}

export interface LanIp {
  interface: string;
  address: string;
}

export interface BoardData {
  columns: Column[];
  members: Member[];
  tasks: Task[];
  lanIps?: LanIp[];
  serverPort?: number;
}
