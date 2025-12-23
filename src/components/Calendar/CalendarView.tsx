import { useEffect, useState, useRef, useCallback } from 'react';
import { useCalendarStore, useProjectStore } from '../../store';
import { getTodayString, addDays, getDayName, getFormattedDate, formatTime, formatWeek } from '../../types/calendar';
import type { CalendarEvent, WeeklyTodo } from '../../types/calendar';
import { EventDialog, type DeleteMode } from './EventDialog';
import { WeeklyTodoPanel } from './WeeklyTodoPanel';

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

interface EventDragState {
  event: CalendarEvent;
  dayIndex: number;
  initialY: number; // Where the drag started
  currentY: number; // Current mouse Y position
  offsetY: number; // Where on the event the user clicked
  originalStartTime: number;
  duration: number;
  // Calculated values for easy access
  newStartTime: number;
  newEndTime: number;
  hasMoved: boolean; // True if mouse moved beyond threshold
}

const MIN_DRAG_DISTANCE = 10; // Minimum pixels to move before it's considered a drag

interface PendingMoveState {
  event: CalendarEvent;
  newStartTime: number;
  newEndTime: number;
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
    deleteRepeatGroup,
    enableRepeat,
    disableRepeat,
    getRepeatGroupCount,
    getEventsForDate,
    assignWeeklyTodoToDate,
    getWeeklyTodosForDate,
  } = useCalendarStore();

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date(getTodayString());
    const day = today.getDay();
    const diff = today.getDate() - day; // Adjust to get Sunday
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [eventDragState, setEventDragState] = useState<EventDragState | null>(null);
  const eventDragRef = useRef<EventDragState | null>(null); // Ref to track latest drag state
  const justFinishedDragging = useRef(false); // Prevent click after drag
  const [pendingMove, setPendingMove] = useState<PendingMoveState | null>(null);
  const [eventDialog, setEventDialog] = useState<{
    isOpen: boolean;
    date: string;
    startTime: number;
    endTime: number;
    event?: CalendarEvent;
  } | null>(null);
  const [draggedWeeklyTodo, setDraggedWeeklyTodo] = useState<WeeklyTodo | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);

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

    // Don't open dialog if we just finished dragging (click fires after mouseup)
    if (justFinishedDragging.current) {
      justFinishedDragging.current = false;
      return;
    }

    // Don't open dialog if we're currently dragging
    if (eventDragState) return;

    // Don't open dialog if there's a pending move confirmation
    if (pendingMove) return;

    setEventDialog({
      isOpen: true,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      event,
    });
  };

  // Handle event drag start
  const handleEventDragStart = (e: React.MouseEvent, event: CalendarEvent, dayIndex: number) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const eventTop = timeToY(event.startTime);
    const offsetY = y - eventTop;
    const duration = event.endTime - event.startTime;

    const dragData: EventDragState = {
      event,
      dayIndex,
      initialY: y, // Track where drag started
      currentY: y,
      offsetY,
      originalStartTime: event.startTime,
      duration,
      newStartTime: event.startTime, // Initially same as original
      newEndTime: event.endTime,
      hasMoved: false, // Haven't moved beyond threshold yet
    };

    setEventDragState(dragData);
    eventDragRef.current = dragData;
  };

  // Handle event drag move and end
  useEffect(() => {
    if (!eventDragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect || !eventDragRef.current) return;

      const y = Math.max(0, Math.min(e.clientY - rect.top, TOTAL_HOURS * HOUR_HEIGHT));

      // Check if movement exceeds threshold
      const distanceMoved = Math.abs(y - eventDragRef.current.initialY);
      const hasMoved = eventDragRef.current.hasMoved || distanceMoved >= MIN_DRAG_DISTANCE;

      // Calculate the new event position
      const newEventTop = Math.max(0, y - eventDragRef.current.offsetY);
      const newStartTime = yToTime(newEventTop);
      const newEndTime = Math.min(1440, newStartTime + eventDragRef.current.duration);

      // Update ref FIRST (synchronous) so mouseup always has latest values
      eventDragRef.current = {
        ...eventDragRef.current,
        currentY: y,
        newStartTime,
        newEndTime,
        hasMoved,
      };

      // Then update state for re-render
      setEventDragState(prev => prev ? {
        ...prev,
        currentY: y,
        newStartTime,
        newEndTime,
        hasMoved,
      } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Use ref for latest values (avoids stale closure)
      const dragData = eventDragRef.current;

      if (!dragData || !currentProject) {
        setEventDragState(null);
        eventDragRef.current = null;
        return;
      }

      // Check if this was just a click (no significant movement)
      if (!dragData.hasMoved) {
        // It was just a click - open edit dialog
        setEventDragState(null);
        eventDragRef.current = null;

        setEventDialog({
          isOpen: true,
          date: dragData.event.date,
          startTime: dragData.event.startTime,
          endTime: dragData.event.endTime,
          event: dragData.event,
        });
        return;
      }

      // Mark that we just finished dragging to prevent click event from firing
      justFinishedDragging.current = true;

      // Reset the flag after a short delay (after click event would have fired)
      setTimeout(() => {
        justFinishedDragging.current = false;
      }, 100);

      // Calculate final position from mouseup event directly (most accurate)
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) {
        setEventDragState(null);
        eventDragRef.current = null;
        return;
      }

      const finalY = Math.max(0, Math.min(e.clientY - rect.top, TOTAL_HOURS * HOUR_HEIGHT));
      const finalEventTop = Math.max(0, finalY - dragData.offsetY);
      const finalStartTime = yToTime(finalEventTop);
      const finalEndTime = Math.min(1440, finalStartTime + dragData.duration);

      // Only show confirmation if the time actually changed
      if (finalStartTime !== dragData.originalStartTime && finalEndTime <= 1440) {
        setPendingMove({
          event: dragData.event,
          newStartTime: finalStartTime,
          newEndTime: finalEndTime,
        });
      }

      setEventDragState(null);
      eventDragRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [eventDragState, currentProject, yToTime]);

  // Handle confirming the move
  const handleConfirmMove = async (applyToAll: boolean) => {
    if (!pendingMove || !currentProject) {
      setPendingMove(null);
      return;
    }

    const { event, newStartTime, newEndTime } = pendingMove;
    const timeDelta = newStartTime - event.startTime;

    if (applyToAll && event.repeatGroupId) {
      // Update all events in the repeat group
      const { events } = useCalendarStore.getState();
      const groupEvents = events.filter(e => e.repeatGroupId === event.repeatGroupId);

      for (const groupEvent of groupEvents) {
        const newStart = groupEvent.startTime + timeDelta;
        const newEnd = groupEvent.endTime + timeDelta;
        // Only update if within valid time range
        if (newStart >= 0 && newEnd <= 1440) {
          await updateEvent(currentProject.path, groupEvent.id, {
            startTime: newStart,
            endTime: newEnd,
          });
        }
      }
    } else {
      // Update just this event
      await updateEvent(currentProject.path, event.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }

    setPendingMove(null);
  };

  const handleCancelMove = () => {
    setPendingMove(null);
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
      const existingEvent = eventDialog.event;

      // Update basic properties
      await updateEvent(currentProject.path, existingEvent.id, {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color,
      });

      // Handle repeat toggle
      if (data.repeat && !existingEvent.repeat) {
        // Enabling repeat - expand into instances
        await enableRepeat(currentProject.path, existingEvent.id);
      } else if (!data.repeat && existingEvent.repeat) {
        // Disabling repeat - remove all instances except this one
        await disableRepeat(currentProject.path, existingEvent.id);
      }
    } else {
      // Create new event
      await addEvent(currentProject.path, {
        title: data.title,
        date: eventDialog.date,
        startTime: data.startTime,
        endTime: data.endTime,
        repeat: false, // Start as non-repeating
        color: data.color,
      });

      // If repeat was requested, enable it after creation
      // Note: We need to get the event ID from the store after creation
      if (data.repeat) {
        // The addEvent updated the store, so we need to find the newly created event
        const events = useCalendarStore.getState().events;
        const createdEvent = events.find(e =>
          e.date === eventDialog.date &&
          e.title === data.title &&
          e.startTime === data.startTime
        );
        if (createdEvent) {
          await enableRepeat(currentProject.path, createdEvent.id);
        }
      }
    }

    setEventDialog(null);
  };

  // Handle delete event
  const handleDeleteEvent = async (mode: DeleteMode) => {
    if (!currentProject || !eventDialog?.event) return;

    const event = eventDialog.event;

    if (mode === 'all' && event.repeatGroupId) {
      // Delete all occurrences
      await deleteRepeatGroup(currentProject.path, event.repeatGroupId);
    } else {
      // Delete just this occurrence
      await deleteEvent(currentProject.path, event.id);
    }

    setEventDialog(null);
  };

  // Handle weekly todo drag start
  const handleWeeklyTodoDragStart = (todo: WeeklyTodo) => {
    setDraggedWeeklyTodo(todo);
  };

  // Handle weekly todo drop on date
  const handleWeeklyTodoDropOnDate = async (date: string) => {
    if (!currentProject || !draggedWeeklyTodo) return;

    await assignWeeklyTodoToDate(currentProject.path, draggedWeeklyTodo.id, date);
    setDraggedWeeklyTodo(null);
    setDropTargetDate(null);
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
    const isDragging = eventDragState?.event.id === event.id;

    // Calculate position - use drag state if dragging, otherwise normal position
    let top: number;
    let displayStartTime: number;
    let displayEndTime: number;

    if (isDragging && eventDragState) {
      // Use the pre-calculated times from drag state
      displayStartTime = eventDragState.newStartTime;
      displayEndTime = eventDragState.newEndTime;
      top = timeToY(displayStartTime);
    } else {
      top = timeToY(event.startTime);
      displayStartTime = event.startTime;
      displayEndTime = event.endTime;
    }

    const height = Math.max(timeToY(displayEndTime) - timeToY(displayStartTime), 20);
    const bgColor = event.color || 'bg-indigo-500';

    return (
      <div
        key={`${event.id}-${event.date}`}
        className={`absolute ${bgColor} text-white rounded px-2 py-1 cursor-grab active:cursor-grabbing hover:opacity-90 overflow-hidden shadow-sm ${
          isDragging ? 'opacity-80 shadow-lg z-30 ring-2 ring-white' : ''
        }`}
        style={{
          top,
          height,
          left: `calc(${dayIndex * (100 / 7)}% + 2px)`,
          width: `calc(${100 / 7}% - 4px)`,
          transition: isDragging ? 'none' : 'all 0.15s ease',
        }}
        onMouseDown={(e) => handleEventDragStart(e, event, dayIndex)}
        onClick={(e) => handleEventClick(e, event)}
      >
        <div className="text-xs font-medium truncate">{event.title}</div>
        {height > 30 && (
          <div className="text-xs opacity-80">
            {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
          </div>
        )}
        {event.repeat && (
          <div className="absolute top-1 right-1">
            <svg className="w-3 h-3 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  };

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

          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800">
              {getFormattedDate(weekStart)} - {getFormattedDate(addDays(weekStart, 6))}
            </h2>
            <span className="text-xs text-slate-500">{formatWeek(weekStart)}</span>
          </div>

          <div className="w-24" /> {/* Spacer for balance */}
        </div>

        {/* Day headers with drop zones */}
        <div className="flex border-b border-slate-200">
          <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
          {weekDays.map((date) => {
            const isDropTarget = dropTargetDate === date;
            const dayTodos = getWeeklyTodosForDate(date);
            const incompleteTodos = dayTodos.filter(t => !t.completed).length;

            return (
              <div
                key={date}
                className={`flex-1 py-2 text-center border-l border-slate-200 cursor-pointer transition-colors ${
                  date === today ? 'bg-indigo-50' : ''
                } ${date === selectedDate ? 'ring-2 ring-inset ring-indigo-400' : ''} ${
                  isDropTarget ? 'bg-indigo-100 ring-2 ring-indigo-400' : ''
                } hover:bg-slate-50`}
                onClick={() => handleDayClick(date)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedWeeklyTodo) {
                    setDropTargetDate(date);
                  }
                }}
                onDragLeave={() => setDropTargetDate(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedWeeklyTodo) {
                    handleWeeklyTodoDropOnDate(date);
                  }
                }}
              >
                <div className="text-xs text-slate-500 uppercase">{getDayName(date)}</div>
                <div className={`text-lg font-semibold ${
                  date === today ? 'text-indigo-600' : 'text-slate-800'
                }`}>
                  {new Date(date).getDate()}
                </div>
                {/* Show todo count badge */}
                {incompleteTodos > 0 && (
                  <div className="mt-1">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {incompleteTodos}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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

      {/* Weekly Todo Panel */}
      <WeeklyTodoPanel
        weekStart={weekStart}
        selectedDate={selectedDate}
        onDragStart={handleWeeklyTodoDragStart}
      />

      {/* Event dialog */}
      {eventDialog?.isOpen && (
        <EventDialog
          date={eventDialog.date}
          startTime={eventDialog.startTime}
          endTime={eventDialog.endTime}
          event={eventDialog.event}
          repeatGroupCount={eventDialog.event?.repeatGroupId ? getRepeatGroupCount(eventDialog.event.repeatGroupId) : 0}
          onSave={handleSaveEvent}
          onDelete={eventDialog.event ? handleDeleteEvent : undefined}
          onClose={() => setEventDialog(null)}
        />
      )}

      {/* Move confirmation dialog */}
      {pendingMove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Move Event</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-2">
                Move <span className="font-medium">{pendingMove.event.title}</span> to:
              </p>
              <p className="text-lg font-medium text-indigo-600 mb-4">
                {formatTime(pendingMove.newStartTime)} - {formatTime(pendingMove.newEndTime)}
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Previously: {formatTime(pendingMove.event.startTime)} - {formatTime(pendingMove.event.endTime)}
              </p>

              {pendingMove.event.repeat && pendingMove.event.repeatGroupId ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 font-medium">
                    This is a repeating event. Apply change to:
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleConfirmMove(false)}
                      className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="font-medium">This occurrence only</div>
                      <div className="text-xs text-slate-500">Only change the time for this day</div>
                    </button>
                    <button
                      onClick={() => handleConfirmMove(true)}
                      className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-left"
                    >
                      <div className="font-medium">All occurrences ({getRepeatGroupCount(pendingMove.event.repeatGroupId!)})</div>
                      <div className="text-xs text-indigo-200">Change time for all days in this series</div>
                    </button>
                  </div>
                  <button
                    onClick={handleCancelMove}
                    className="w-full px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelMove}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmMove(false)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Confirm Move
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
