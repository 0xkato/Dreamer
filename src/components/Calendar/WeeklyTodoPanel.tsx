import { useState } from 'react';
import { useCalendarStore, useProjectStore } from '../../store';
import { formatWeek, addDays, getDayName, getFormattedDate } from '../../types/calendar';
import type { WeeklyTodo } from '../../types/calendar';

interface WeeklyTodoPanelProps {
  weekStart: string;
  selectedDate: string;
  onDragStart: (todo: WeeklyTodo) => void;
}

export function WeeklyTodoPanel({ weekStart, selectedDate, onDragStart }: WeeklyTodoPanelProps) {
  const { currentProject } = useProjectStore();
  const {
    addWeeklyTodo,
    updateWeeklyTodo,
    deleteWeeklyTodo,
    toggleWeeklyTodoComplete,
    assignWeeklyTodoToDate,
    getUnassignedWeeklyTodos,
    getWeeklyTodosForDate,
    getWeeklyTodosForWeek,
  } = useCalendarStore();

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);
  const [assignedExpanded, setAssignedExpanded] = useState(true);

  // Get todos
  const unassignedTodos = getUnassignedWeeklyTodos(weekStart);
  const allWeekTodos = getWeeklyTodosForWeek(weekStart);
  const assignedTodos = allWeekTodos.filter(t => t.assignedDate !== null);

  // Get week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newTodoTitle.trim()) return;

    await addWeeklyTodo(currentProject.path, weekStart, newTodoTitle.trim());
    setNewTodoTitle('');
  };

  const handleStartEdit = (todo: WeeklyTodo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
  };

  const handleSaveEdit = async () => {
    if (!currentProject || !editingTodoId || !editingTitle.trim()) return;

    await updateWeeklyTodo(currentProject.path, editingTodoId, {
      title: editingTitle.trim(),
    });

    setEditingTodoId(null);
    setEditingTitle('');
  };

  const handleDelete = async (todoId: string) => {
    if (!currentProject) return;
    await deleteWeeklyTodo(currentProject.path, todoId);
  };

  const handleToggleComplete = async (todoId: string) => {
    if (!currentProject) return;
    await toggleWeeklyTodoComplete(currentProject.path, todoId);
  };

  const handleUnassign = async (todoId: string) => {
    if (!currentProject) return;
    await assignWeeklyTodoToDate(currentProject.path, todoId, null);
  };

  const renderTodoItem = (todo: WeeklyTodo, showDragHandle = true, showDate = false) => {
    const isEditing = editingTodoId === todo.id;

    return (
      <div
        key={todo.id}
        className={`flex items-center gap-2 p-2 rounded-lg group ${
          todo.completed ? 'bg-slate-50' : 'bg-white'
        } border border-slate-200 hover:border-slate-300 transition-colors`}
        draggable={showDragHandle && !isEditing && !todo.completed}
        onDragStart={(e) => {
          e.dataTransfer.setData('weekly-todo-id', todo.id);
          onDragStart(todo);
        }}
      >
        {/* Drag handle */}
        {showDragHandle && !isEditing && !todo.completed && (
          <div className="cursor-grab text-slate-300 hover:text-slate-500">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
            </svg>
          </div>
        )}

        {/* Checkbox */}
        <button
          onClick={() => handleToggleComplete(todo.id)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            todo.completed
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 hover:border-emerald-400'
          }`}
        >
          {todo.completed && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') {
                setEditingTodoId(null);
                setEditingTitle('');
              }
            }}
            className="flex-1 px-2 py-0.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        ) : (
          <div className="flex-1 min-w-0">
            <span
              className={`text-sm cursor-pointer truncate block ${
                todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'
              }`}
              onDoubleClick={() => handleStartEdit(todo)}
            >
              {todo.title}
            </span>
            {showDate && todo.assignedDate && (
              <span className="text-xs text-slate-400">
                {getDayName(todo.assignedDate)}, {getFormattedDate(todo.assignedDate)}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            {todo.assignedDate && (
              <button
                onClick={() => handleUnassign(todo.id)}
                className="p-1 text-slate-400 hover:text-orange-500 rounded"
                title="Unassign from day"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => handleStartEdit(todo)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(todo.id)}
              className="p-1 text-slate-400 hover:text-red-500 rounded"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Section header component
  const SectionHeader = ({
    title,
    count,
    expanded,
    onToggle,
    color = 'slate'
  }: {
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
    color?: string;
  }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 px-1 hover:bg-slate-100 rounded transition-colors"
    >
      <div className="flex items-center gap-2">
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className={`text-xs font-semibold uppercase tracking-wide ${
          color === 'indigo' ? 'text-indigo-600' : 'text-slate-500'
        }`}>
          {title}
        </span>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        color === 'indigo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
      }`}>
        {count}
      </span>
    </button>
  );

  // Stats
  const completedCount = allWeekTodos.filter(t => t.completed).length;
  const totalCount = allWeekTodos.length;

  return (
    <div className="w-80 h-full flex flex-col bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <h3 className="font-semibold text-slate-800">{formatWeek(weekStart)}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {completedCount} of {totalCount} completed
        </p>
      </div>

      {/* Add todo form */}
      <form onSubmit={handleAddTodo} className="p-3 border-b border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Add a task for this week..."
            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newTodoTitle.trim()}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </form>

      {/* Drag hint */}
      <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
        <p className="text-xs text-indigo-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Drag tasks to calendar dates to assign them
        </p>
      </div>

      {/* Todo lists */}
      <div className="flex-1 overflow-auto p-2">
        {/* Unassigned Section */}
        <div className="mb-3">
          <SectionHeader
            title="This Week"
            count={unassignedTodos.length}
            expanded={unassignedExpanded}
            onToggle={() => setUnassignedExpanded(!unassignedExpanded)}
          />

          {unassignedExpanded && (
            <div className="space-y-1 mt-1">
              {unassignedTodos.length > 0 ? (
                unassignedTodos.map(todo => renderTodoItem(todo, true, false))
              ) : (
                <p className="text-xs text-slate-400 italic py-2 px-2">
                  No unassigned tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* Assigned Section */}
        <div>
          <SectionHeader
            title="Assigned to Days"
            count={assignedTodos.length}
            expanded={assignedExpanded}
            onToggle={() => setAssignedExpanded(!assignedExpanded)}
            color="indigo"
          />

          {assignedExpanded && (
            <div className="space-y-1 mt-1">
              {assignedTodos.length > 0 ? (
                weekDays.map(date => {
                  const dayTodos = getWeeklyTodosForDate(date);
                  if (dayTodos.length === 0) return null;

                  return (
                    <div key={date} className="mb-2">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <span className={`text-xs font-medium ${
                          date === selectedDate ? 'text-indigo-600' : 'text-slate-500'
                        }`}>
                          {getDayName(date)}, {getFormattedDate(date)}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({dayTodos.filter(t => !t.completed).length} remaining)
                        </span>
                      </div>
                      <div className="space-y-1 ml-2">
                        {dayTodos.map(todo => renderTodoItem(todo, true, false))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic py-2 px-2">
                  Drag tasks to calendar dates to assign them
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
