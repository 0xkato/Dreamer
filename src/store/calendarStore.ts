import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent, CalendarTodo, WeeklyTodo } from '../types/calendar';
import { getTodayString, getEventsForDate } from '../types/calendar';
import {
  readCalendarFile,
  writeCalendarFile,
} from '../services/fileSystem';

interface CalendarStore {
  // State
  events: CalendarEvent[];
  todos: CalendarTodo[];
  weeklyTodos: WeeklyTodo[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  // View state
  viewMode: 'day' | 'week';

  // Actions
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: 'day' | 'week') => void;

  // Event operations
  loadCalendar: (projectPath: string) => Promise<void>;
  addEvent: (projectPath: string, event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (projectPath: string, eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (projectPath: string, eventId: string) => Promise<void>;
  toggleRepeat: (projectPath: string, eventId: string) => Promise<void>;

  // Todo operations (legacy per-day)
  addTodo: (projectPath: string, todo: Omit<CalendarTodo, 'id' | 'createdAt' | 'order'>) => Promise<void>;
  updateTodo: (projectPath: string, todoId: string, updates: Partial<CalendarTodo>) => Promise<void>;
  deleteTodo: (projectPath: string, todoId: string) => Promise<void>;
  toggleTodoComplete: (projectPath: string, todoId: string) => Promise<void>;
  assignTodoToBlock: (projectPath: string, todoId: string, workBlockId: string | undefined) => Promise<void>;
  reorderTodos: (projectPath: string, todoIds: string[]) => Promise<void>;

  // Weekly todo operations
  addWeeklyTodo: (projectPath: string, weekStart: string, title: string) => Promise<void>;
  updateWeeklyTodo: (projectPath: string, todoId: string, updates: Partial<WeeklyTodo>) => Promise<void>;
  deleteWeeklyTodo: (projectPath: string, todoId: string) => Promise<void>;
  toggleWeeklyTodoComplete: (projectPath: string, todoId: string) => Promise<void>;
  assignWeeklyTodoToDate: (projectPath: string, todoId: string, date: string | null) => Promise<void>;

  // Helpers
  getEventsForDate: (date: string) => CalendarEvent[];
  getTodosForDate: (date: string) => CalendarTodo[];
  getTodosForBlock: (date: string, workBlockId: string) => CalendarTodo[];
  getUnassignedTodos: (date: string) => CalendarTodo[];
  getWeeklyTodosForWeek: (weekStart: string) => WeeklyTodo[];
  getWeeklyTodosForDate: (date: string) => WeeklyTodo[];
  getUnassignedWeeklyTodos: (weekStart: string) => WeeklyTodo[];
  clearError: () => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  todos: [],
  weeklyTodos: [],
  selectedDate: getTodayString(),
  isLoading: false,
  error: null,
  viewMode: 'week',

  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),

  loadCalendar: async (projectPath) => {
    set({ isLoading: true, error: null });
    try {
      const data = await readCalendarFile(projectPath);
      set({
        events: data.events,
        todos: data.todos || [],
        weeklyTodos: data.weeklyTodos || [],
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar',
      });
    }
  },

  // Helper to save current state
  _saveState: async (projectPath: string) => {
    const { events, todos, weeklyTodos } = get();
    await writeCalendarFile(projectPath, { version: '1.0.0', events, todos, weeklyTodos });
  },

  addEvent: async (projectPath, eventData) => {
    const event: CalendarEvent = {
      ...eventData,
      id: uuidv4(),
    };

    const { events, todos, weeklyTodos } = get();
    const newEvents = [...events, event];

    set({ events: newEvents });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events: newEvents, todos, weeklyTodos });
    } catch (error) {
      set({ events, error: error instanceof Error ? error.message : 'Failed to save event' });
    }
  },

  updateEvent: async (projectPath, eventId, updates) => {
    const { events, todos, weeklyTodos } = get();
    const index = events.findIndex(e => e.id === eventId);

    if (index === -1) return;

    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], ...updates };

    set({ events: newEvents });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events: newEvents, todos, weeklyTodos });
    } catch (error) {
      set({ events, error: error instanceof Error ? error.message : 'Failed to update event' });
    }
  },

  deleteEvent: async (projectPath, eventId) => {
    const { events, todos, weeklyTodos } = get();
    const newEvents = events.filter(e => e.id !== eventId);
    // Also unassign any todos from this event
    const newTodos = todos.map(t =>
      t.workBlockId === eventId ? { ...t, workBlockId: undefined } : t
    );

    set({ events: newEvents, todos: newTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events: newEvents, todos: newTodos, weeklyTodos });
    } catch (error) {
      set({ events, todos, error: error instanceof Error ? error.message : 'Failed to delete event' });
    }
  },

  toggleRepeat: async (projectPath, eventId) => {
    const { events, updateEvent } = get();
    const event = events.find(e => e.id === eventId);

    if (!event) return;

    if (!event.repeat) {
      await updateEvent(projectPath, eventId, {
        repeat: true,
        repeatStartDate: event.date,
        repeatEnabled: true,
      });
    } else {
      await updateEvent(projectPath, eventId, {
        repeatEnabled: !event.repeatEnabled,
      });
    }
  },

  // Todo operations (legacy per-day)
  addTodo: async (projectPath, todoData) => {
    const { events, todos, weeklyTodos } = get();

    // Get max order for this date
    const dateTodos = todos.filter(t => t.date === todoData.date);
    const maxOrder = dateTodos.length > 0 ? Math.max(...dateTodos.map(t => t.order)) : -1;

    const todo: CalendarTodo = {
      ...todoData,
      id: uuidv4(),
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };

    const newTodos = [...todos, todo];
    set({ todos: newTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos: newTodos, weeklyTodos });
    } catch (error) {
      set({ todos, error: error instanceof Error ? error.message : 'Failed to save todo' });
    }
  },

  updateTodo: async (projectPath, todoId, updates) => {
    const { events, todos, weeklyTodos } = get();
    const index = todos.findIndex(t => t.id === todoId);

    if (index === -1) return;

    const newTodos = [...todos];
    newTodos[index] = { ...newTodos[index], ...updates };

    set({ todos: newTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos: newTodos, weeklyTodos });
    } catch (error) {
      set({ todos, error: error instanceof Error ? error.message : 'Failed to update todo' });
    }
  },

  deleteTodo: async (projectPath, todoId) => {
    const { events, todos, weeklyTodos } = get();
    const newTodos = todos.filter(t => t.id !== todoId);

    set({ todos: newTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos: newTodos, weeklyTodos });
    } catch (error) {
      set({ todos, error: error instanceof Error ? error.message : 'Failed to delete todo' });
    }
  },

  toggleTodoComplete: async (projectPath, todoId) => {
    const { todos, updateTodo } = get();
    const todo = todos.find(t => t.id === todoId);

    if (!todo) return;

    await updateTodo(projectPath, todoId, { completed: !todo.completed });
  },

  assignTodoToBlock: async (projectPath, todoId, workBlockId) => {
    const { updateTodo } = get();
    await updateTodo(projectPath, todoId, { workBlockId });
  },

  reorderTodos: async (projectPath, todoIds) => {
    const { events, todos, weeklyTodos } = get();

    const newTodos = todos.map(todo => {
      const newOrder = todoIds.indexOf(todo.id);
      if (newOrder !== -1) {
        return { ...todo, order: newOrder };
      }
      return todo;
    });

    set({ todos: newTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos: newTodos, weeklyTodos });
    } catch (error) {
      set({ todos, error: error instanceof Error ? error.message : 'Failed to reorder todos' });
    }
  },

  // Weekly todo operations
  addWeeklyTodo: async (projectPath, weekStart, title) => {
    const { events, todos, weeklyTodos } = get();

    // Get max order for this week
    const weekTodos = weeklyTodos.filter(t => t.weekStart === weekStart);
    const maxOrder = weekTodos.length > 0 ? Math.max(...weekTodos.map(t => t.order)) : -1;

    const todo: WeeklyTodo = {
      id: uuidv4(),
      title,
      weekStart,
      assignedDate: null,
      completed: false,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };

    const newWeeklyTodos = [...weeklyTodos, todo];
    set({ weeklyTodos: newWeeklyTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos, weeklyTodos: newWeeklyTodos });
    } catch (error) {
      set({ weeklyTodos, error: error instanceof Error ? error.message : 'Failed to save todo' });
    }
  },

  updateWeeklyTodo: async (projectPath, todoId, updates) => {
    const { events, todos, weeklyTodos } = get();
    const index = weeklyTodos.findIndex(t => t.id === todoId);

    if (index === -1) return;

    const newWeeklyTodos = [...weeklyTodos];
    newWeeklyTodos[index] = { ...newWeeklyTodos[index], ...updates };

    set({ weeklyTodos: newWeeklyTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos, weeklyTodos: newWeeklyTodos });
    } catch (error) {
      set({ weeklyTodos, error: error instanceof Error ? error.message : 'Failed to update todo' });
    }
  },

  deleteWeeklyTodo: async (projectPath, todoId) => {
    const { events, todos, weeklyTodos } = get();
    const newWeeklyTodos = weeklyTodos.filter(t => t.id !== todoId);

    set({ weeklyTodos: newWeeklyTodos });

    try {
      await writeCalendarFile(projectPath, { version: '1.0.0', events, todos, weeklyTodos: newWeeklyTodos });
    } catch (error) {
      set({ weeklyTodos, error: error instanceof Error ? error.message : 'Failed to delete todo' });
    }
  },

  toggleWeeklyTodoComplete: async (projectPath, todoId) => {
    const { weeklyTodos, updateWeeklyTodo } = get();
    const todo = weeklyTodos.find(t => t.id === todoId);

    if (!todo) return;

    await updateWeeklyTodo(projectPath, todoId, { completed: !todo.completed });
  },

  assignWeeklyTodoToDate: async (projectPath, todoId, date) => {
    const { updateWeeklyTodo } = get();
    await updateWeeklyTodo(projectPath, todoId, { assignedDate: date });
  },

  // Helpers
  getEventsForDate: (date) => {
    const { events } = get();
    return getEventsForDate(events, date);
  },

  getTodosForDate: (date) => {
    const { todos } = get();
    return todos
      .filter(t => t.date === date)
      .sort((a, b) => a.order - b.order);
  },

  getTodosForBlock: (date, workBlockId) => {
    const { todos } = get();
    return todos
      .filter(t => t.date === date && t.workBlockId === workBlockId)
      .sort((a, b) => a.order - b.order);
  },

  getUnassignedTodos: (date) => {
    const { todos } = get();
    return todos
      .filter(t => t.date === date && !t.workBlockId)
      .sort((a, b) => a.order - b.order);
  },

  getWeeklyTodosForWeek: (weekStart) => {
    const { weeklyTodos } = get();
    return weeklyTodos
      .filter(t => t.weekStart === weekStart)
      .sort((a, b) => a.order - b.order);
  },

  getWeeklyTodosForDate: (date) => {
    const { weeklyTodos } = get();
    return weeklyTodos
      .filter(t => t.assignedDate === date)
      .sort((a, b) => a.order - b.order);
  },

  getUnassignedWeeklyTodos: (weekStart) => {
    const { weeklyTodos } = get();
    return weeklyTodos
      .filter(t => t.weekStart === weekStart && t.assignedDate === null)
      .sort((a, b) => a.order - b.order);
  },

  clearError: () => set({ error: null }),
}));
