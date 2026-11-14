export type Priority = "high" | "medium" | "low";
export type TaskStatus = "open" | "in_progress" | "done";

export interface Person {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
}

export interface TimeLog {
  id: string;
  personId: string;
  date: string;
  minutes: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type ActivityEvent =
  | { id: string; type: "comment"; personId: string; at: string; text: string }
  | { id: string; type: "status_change"; personId: string; at: string; text: string }
  | { id: string; type: "ai_summary"; at: string; text: string };

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  section: string;
  assigneeId: string;
  dueDate: string | null;
  projectId: string;
  priority: Priority | null;
  percentAllocation: number | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  timeLogs: TimeLog[];
  tags: string[];
  description: string;
  subtasks: Subtask[];
  activity: ActivityEvent[];
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}
