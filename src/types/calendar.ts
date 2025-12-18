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
  repeatStartDate?: string; // When the repeat started (YYYY-MM-DD)
  repeatEnabled?: boolean; // Can be disabled to stop repeat
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

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
}

export interface CalendarData {
  version: string;
  events: CalendarEvent[];
  todos: CalendarTodo[];
}

// Helper to check if a repeating event should show on a given date
export function shouldShowRepeatingEvent(event: CalendarEvent, targetDate: string): boolean {
  if (!event.repeat || !event.repeatEnabled || !event.repeatStartDate) {
    return false;
  }

  const start = new Date(event.repeatStartDate);
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Event must be on or after start date
  if (target < start) {
    return false;
  }

  // Rolling 90-day window from today
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 90);

  // Target must be within 90 days from today
  if (target > windowEnd) {
    return false;
  }

  return true;
}

// Get events for a specific date (including repeating events)
export function getEventsForDate(allEvents: CalendarEvent[], targetDate: string): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const event of allEvents) {
    // Non-repeating event - exact date match
    if (!event.repeat) {
      if (event.date === targetDate) {
        result.push(event);
      }
    } else {
      // Repeating event - check if should show
      if (shouldShowRepeatingEvent(event, targetDate)) {
        // Create a copy with the target date
        result.push({
          ...event,
          date: targetDate,
        });
      }
    }
  }

  return result;
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
