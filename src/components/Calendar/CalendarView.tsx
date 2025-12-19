import { useEffect, useState, useRef, useCallback } from 'react';
import { useCalendarStore, useProjectStore } from '../../store';
import { getTodayString, addDays, getDayName, getFormattedDate, formatTime } from '../../types/calendar';
import type { CalendarEvent, CalendarTodo } from '../../types/calendar';
import { EventDialog } from './EventDialog';
import { TodoPanel } from './TodoPanel';

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 0; // Start at midnight
const END_HOUR = 24; // End at midnight (full day)
const TOTAL_HOURS = END_HOUR - START_HOUR;

interface DragState {
  isDragging: boolean;
  dayIndex: number;
  startY: number;
  currentY: number;
  date: string;
}

export function CalendarView() {
  const { currentProject } = useProjectStore();
  const {
    selectedDate,
    setSelectedDate,
    loadCalendar,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    assignTodoToBlock,
    getTodosForBlock,
  } = useCalendarStore();

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date(getTodayString());
    const day = today.getDay();
    const diff = today.getDate() - day; // Adjust to get Sunday
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [eventDialog, setEventDialog] = useState<{
    isOpen: boolean;
    date: string;
    startTime: number;
    endTime: number;
    event?: CalendarEvent;
  } | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<CalendarTodo | null>(null);
  const [dropTargetEventId, setDropTargetEventId] = useState<string | null>(null);

  // Current time indicator
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const gridRef = useRef<HTMLDivElement>(null);

  // Load calendar when project changes
  useEffect(() => {
    if (currentProject) {
      loadCalendar(currentProject.path);
    }
  }, [currentProject, loadCalendar]);

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    };

    // Update immediately
    updateTime();

    // Then update every minute
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = getTodayString();

  // Navigate weeks
  const goToPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => {
    const todayDate = new Date(getTodayString());
    const day = todayDate.getDay();
    const diff = todayDate.getDate() - day;
    const sunday = new Date(todayDate.setDate(diff));
    setWeekStart(sunday.toISOString().split('T')[0]);
    setSelectedDate(getTodayString());
  };

  // Convert Y position to time (minutes from midnight)
  const yToTime = useCallback((y: number): number => {
    const minutes = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15; // Round to 15 min
    return Math.max(0, Math.min(1440, minutes + START_HOUR * 60));
  }, []);

  // Convert time to Y position
  const timeToY = useCallback((minutes: number): number => {
    return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }, []);

  // Handle mouse down to start drag
  const handleMouseDown = (e: React.MouseEvent, dayIndex: number, date: string) => {
    if (e.button !== 0) return; // Only left click

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;

    setDragState({
      isDragging: true,
      dayIndex,
      startY: y,
      currentY: y,
      date,
    });
  };

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState?.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const y = Math.max(0, Math.min(e.clientY - rect.top, TOTAL_HOURS * HOUR_HEIGHT));
      setDragState(prev => prev ? { ...prev, currentY: y } : null);
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      const startTime = yToTime(Math.min(dragState.startY, dragState.currentY));
      const endTime = yToTime(Math.max(dragState.startY, dragState.currentY));

      // Only create event if dragged at least 15 minutes
      if (endTime - startTime >= 15) {
        setEventDialog({
          isOpen: true,
          date: dragState.date,
          startTime,
          endTime,
        });
      }

      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, yToTime]);

  // Handle event click
  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEventDialog({
      isOpen: true,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      event,
    });
  };

  // Handle day click (for selecting date)
  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  // Handle save event from dialog
  const handleSaveEvent = async (data: {
    title: string;
    startTime: number;
    endTime: number;
    repeat: boolean;
    color?: string;
  }) => {
    if (!currentProject || !eventDialog) return;

    if (eventDialog.event) {
      // Update existing event
      await updateEvent(currentProject.path, eventDialog.event.id, {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        repeat: data.repeat,
        repeatStartDate: data.repeat ? eventDialog.date : undefined,
        repeatEnabled: data.repeat,
        color: data.color,
      });
    } else {
      // Create new event
      await addEvent(currentProject.path, {
        title: data.title,
        date: eventDialog.date,
        startTime: data.startTime,
        endTime: data.endTime,
        repeat: data.repeat,
        repeatStartDate: data.repeat ? eventDialog.date : undefined,
        repeatEnabled: data.repeat,
        color: data.color,
      });
    }

    setEventDialog(null);
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!currentProject || !eventDialog?.event) return;
    await deleteEvent(currentProject.path, eventDialog.event.id);
    setEventDialog(null);
  };

  // Handle todo drag start
  const handleTodoDragStart = (todo: CalendarTodo) => {
    setDraggedTodo(todo);
  };

  // Handle todo drop on event
  const handleTodoDrop = async (eventId: string) => {
    if (!currentProject || !draggedTodo) return;

    await assignTodoToBlock(currentProject.path, draggedTodo.id, eventId);
    setDraggedTodo(null);
    setDropTargetEventId(null);
  };


  // Render current time indicator
  const renderTimeIndicator = () => {
    // Find if today is in the current week
    const todayIndex = weekDays.findIndex(date => date === today);
    if (todayIndex === -1) return null;

    const top = timeToY(currentTime);

    return (
      <div
        className="absolute pointer-events-none z-20"
        style={{
          top,
          left: `calc(${todayIndex * (100 / 7)}%)`,
          width: `calc(${100 / 7}%)`,
        }}
      >
        {/* Red dot */}
        <div
          className="absolute w-3 h-3 bg-red-500 rounded-full -left-1.5"
          style={{ top: -5 }}
        />
        {/* Red line */}
        <div className="h-0.5 bg-red-500 w-full" />
      </div>
    );
  };

  // Render drag preview
  const renderDragPreview = () => {
    if (!dragState) return null;

    const top = Math.min(dragState.startY, dragState.currentY);
    const height = Math.abs(dragState.currentY - dragState.startY);
    const startTime = yToTime(top);
    const endTime = yToTime(top + height);

    return (
      <div
        className="absolute bg-indigo-200 border-2 border-indigo-400 rounded opacity-70 pointer-events-none z-10"
        style={{
          top,
          height: Math.max(height, 15),
          left: `calc(${dragState.dayIndex * (100 / 7)}% + 2px)`,
          width: `calc(${100 / 7}% - 4px)`,
        }}
      >
        <div className="text-xs text-indigo-800 p-1 font-medium">
          {formatTime(startTime)} - {formatTime(endTime)}
        </div>
      </div>
    );
  };

  // Render event
  const renderEvent = (event: CalendarEvent, dayIndex: number) => {
    const top = timeToY(event.startTime);
    const height = Math.max(timeToY(event.endTime) - top, 20);
    const bgColor = event.color || 'bg-indigo-500';
    const isDropTarget = dropTargetEventId === event.id;
    const eventTodos = getTodosForBlock(event.date, event.id);

    return (
      <div
        key={`${event.id}-${event.date}`}
        className={`absolute ${bgColor} text-white rounded px-2 py-1 cursor-pointer hover:opacity-90 overflow-hidden shadow-sm transition-all ${
          isDropTarget ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
        }`}
        style={{
          top,
          height,
          left: `calc(${dayIndex * (100 / 7)}% + 2px)`,
          width: `calc(${100 / 7}% - 4px)`,
        }}
        onClick={(e) => handleEventClick(e, event)}
        onDragOver={(e) => {
          e.preventDefault();
          setDropTargetEventId(event.id);
        }}
        onDragLeave={() => setDropTargetEventId(null)}
        onDrop={(e) => {
          e.preventDefault();
          handleTodoDrop(event.id);
        }}
      >
        <div className="text-xs font-medium truncate">{event.title}</div>
        {height > 30 && (
          <div className="text-xs opacity-80">
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </div>
        )}
        {/* Show todo count */}
        {eventTodos.length > 0 && (
          <div className="absolute bottom-1 right-1 bg-white/20 rounded px-1.5 py-0.5 text-xs font-medium">
            {eventTodos.filter(t => t.completed).length}/{eventTodos.length}
          </div>
        )}
        {event.repeat && event.repeatEnabled && (
          <div className="absolute top-1 right-1">
            <svg className="w-3 h-3 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  // Get work blocks for selected date (for todo panel)
  const selectedDateBlocks = getEventsForDate(selectedDate);

  return (
    <div className="h-full flex bg-white">
      {/* Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevWeek}
              className="p-1.5 hover:bg-slate-200 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1.5 hover:bg-slate-200 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h2 className="text-lg font-semibold text-slate-800">
            {getFormattedDate(weekStart)} - {getFormattedDate(addDays(weekStart, 6))}
          </h2>

          <div className="w-24" /> {/* Spacer for balance */}
        </div>

        {/* Day headers */}
        <div className="flex border-b border-slate-200">
          <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
          {weekDays.map((date) => (
            <div
              key={date}
              className={`flex-1 py-2 text-center border-l border-slate-200 cursor-pointer transition-colors ${
                date === today ? 'bg-indigo-50' : ''
              } ${date === selectedDate ? 'ring-2 ring-inset ring-indigo-400' : ''} hover:bg-slate-50`}
              onClick={() => handleDayClick(date)}
            >
              <div className="text-xs text-slate-500 uppercase">{getDayName(date)}</div>
              <div className={`text-lg font-semibold ${
                date === today ? 'text-indigo-600' : 'text-slate-800'
              }`}>
                {new Date(date).getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          <div className="flex min-h-full">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="relative border-b border-slate-100"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="absolute -top-2.5 right-2 text-xs text-slate-400">
                    {formatTime((START_HOUR + i) * 60)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 relative" ref={gridRef}>
              {/* Hour lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-b border-slate-100"
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}

              {/* Day columns (for mouse events) */}
              <div className="absolute inset-0 flex">
                {weekDays.map((date, i) => (
                  <div
                    key={date}
                    className={`flex-1 border-l border-slate-200 ${
                      date === today ? 'bg-indigo-50/30' : ''
                    } ${date === selectedDate ? 'bg-indigo-50/50' : ''}`}
                    onMouseDown={(e) => handleMouseDown(e, i, date)}
                  />
                ))}
              </div>

              {/* Events */}
              {weekDays.map((date, dayIndex) => {
                const dayEvents = getEventsForDate(date);
                return dayEvents.map(event => renderEvent(event, dayIndex));
              })}

              {/* Current time indicator */}
              {renderTimeIndicator()}

              {/* Drag preview */}
              {renderDragPreview()}
            </div>
          </div>
        </div>
      </div>

      {/* Todo Panel */}
      <TodoPanel
        selectedDate={selectedDate}
        workBlocks={selectedDateBlocks}
        onDragStart={handleTodoDragStart}
      />

      {/* Event dialog */}
      {eventDialog?.isOpen && (
        <EventDialog
          date={eventDialog.date}
          startTime={eventDialog.startTime}
          endTime={eventDialog.endTime}
          event={eventDialog.event}
          onSave={handleSaveEvent}
          onDelete={eventDialog.event ? handleDeleteEvent : undefined}
          onClose={() => setEventDialog(null)}
        />
      )}
    </div>
  );
}
