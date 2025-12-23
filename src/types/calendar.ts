// Calendar event types (Work Blocks)

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  startTime: number; // Minutes from midnight (0-1440)
  endTime: number; // Minutes from midnight (0-1440)
  color?: string;

  // Repeat settings
  repeat: boolean;
  repeatGroupId?: string; // Shared ID for all instances of a repeating event
  isRepeatInstance?: boolean; // True if this is an auto-generated repeat instance
}

// Todo item that can be assigned to a work block
export interface CalendarTodo {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD - the day this todo is for
  completed: boolean;
  workBlockId?: string; // Optional - if assigned to a specific work block
  order: number; // For sorting within a group
  createdAt: string;
}

// Weekly todo - belongs to a week, can be assigned to a specific day
export interface WeeklyTodo {
  id: string;
  title: string;
  weekStart: string; // YYYY-MM-DD - Sunday of the week this todo belongs to
  assignedDate: string | null; // YYYY-MM-DD - specific day assigned, or null if unassigned
  completed: boolean;
  order: number; // For sorting
  createdAt: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
}

export interface CalendarData {
  version: string;
  events: CalendarEvent[];
  todos: CalendarTodo[];
  weeklyTodos?: WeeklyTodo[]; // New weekly todos
}

// Format minutes to time string (e.g., 540 -> "9:00 AM")
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Parse time string to minutes (e.g., "9:00" -> 540)
export function parseTime(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + (mins || 0);
}

// Get current date as YYYY-MM-DD
export function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Alias for getTodayString
export const getToday = getTodayString;

// Add days to a date string
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Get day name from date string
export function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Get formatted date (e.g., "Dec 17")
export function getFormattedDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get the Sunday (start) of the week for a given date
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.toISOString().split('T')[0];
}

// Get week number of the year (ISO week)
export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1
  const week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Format week as "Week X of YYYY"
export function formatWeek(dateStr: string): string {
  const weekNum = getWeekNumber(dateStr);
  const date = new Date(dateStr);
  return `Week ${weekNum} of ${date.getFullYear()}`;
}
