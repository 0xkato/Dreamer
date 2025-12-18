import { useState } from 'react';
import { useCalendarStore, useProjectStore } from '../../store';
import { getFormattedDate, getDayName } from '../../types/calendar';
import type { CalendarTodo, CalendarEvent } from '../../types/calendar';

interface TodoPanelProps {
  selectedDate: string;
  workBlocks: CalendarEvent[];
  onDragStart: (todo: CalendarTodo) => void;
}

export function TodoPanel({ selectedDate, workBlocks, onDragStart }: TodoPanelProps) {
  const { currentProject } = useProjectStore();
  const {
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodoComplete,
    getTodosForDate,
  } = useCalendarStore();

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [unfinishedExpanded, setUnfinishedExpanded] = useState(true);
  const [finishedExpanded, setFinishedExpanded] = useState(true);

  // Get all todos for the date
  const allTodos = getTodosForDate(selectedDate);
  const unfinishedTodos = allTodos.filter(t => !t.completed);
  const finishedTodos = allTodos.filter(t => t.completed);

  // Group unfinished by work block
  const unassignedUnfinished = unfinishedTodos.filter(t => !t.workBlockId);
  const getBlockUnfinished = (blockId: string) =>
    unfinishedTodos.filter(t => t.workBlockId === blockId);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newTodoTitle.trim()) return;

    await addTodo(currentProject.path, {
      title: newTodoTitle.trim(),
      date: selectedDate,
      completed: false,
    });

    setNewTodoTitle('');
  };

  const handleStartEdit = (todo: CalendarTodo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
  };

  const handleSaveEdit = async () => {
    if (!currentProject || !editingTodoId || !editingTitle.trim()) return;

    await updateTodo(currentProject.path, editingTodoId, {
      title: editingTitle.trim(),
    });

    setEditingTodoId(null);
    setEditingTitle('');
  };

  const handleDelete = async (todoId: string) => {
    if (!currentProject) return;
    await deleteTodo(currentProject.path, todoId);
  };

  const handleToggleComplete = async (todoId: string) => {
    if (!currentProject) return;
    await toggleTodoComplete(currentProject.path, todoId);
  };

  const renderTodoItem = (todo: CalendarTodo, showDragHandle = true, compact = false) => {
    const isEditing = editingTodoId === todo.id;

    return (
      <div
        key={todo.id}
        className={`flex items-center gap-2 ${compact ? 'py-1.5 px-2' : 'p-2'} rounded-lg group ${
          todo.completed ? 'bg-slate-50' : 'bg-white'
        } border border-slate-200 hover:border-slate-300 transition-colors`}
        draggable={showDragHandle && !isEditing && !todo.completed}
        onDragStart={(e) => {
          e.dataTransfer.setData('todo-id', todo.id);
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
          <span
            className={`flex-1 text-sm cursor-pointer truncate ${
              todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'
            }`}
            onDoubleClick={() => handleStartEdit(todo)}
          >
            {todo.title}
          </span>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
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
          color === 'emerald' ? 'text-emerald-600' : 'text-slate-500'
        }`}>
          {title}
        </span>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
      }`}>
        {count}
      </span>
    </button>
  );

  // Work block sub-header
  const BlockSubHeader = ({ block, count }: { block: CalendarEvent; count: number }) => (
    <div className="flex items-center gap-2 py-1 px-2 ml-3">
      <span className={`w-2 h-2 rounded-full ${block.color || 'bg-indigo-500'}`} />
      <span className="text-xs text-slate-500 truncate flex-1">{block.title}</span>
      <span className="text-xs text-slate-400">{count}</span>
    </div>
  );

  return (
    <div className="w-72 h-full flex flex-col bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <h3 className="font-semibold text-slate-800">
          {getDayName(selectedDate)}, {getFormattedDate(selectedDate)}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {finishedTodos.length} of {allTodos.length} completed
        </p>
      </div>

      {/* Add todo form */}
      <form onSubmit={handleAddTodo} className="p-3 border-b border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Add a task..."
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

      {/* Todo lists */}
      <div className="flex-1 overflow-auto p-2">
        {/* Unfinished Section */}
        <div className="mb-2">
          <SectionHeader
            title="Unfinished"
            count={unfinishedTodos.length}
            expanded={unfinishedExpanded}
            onToggle={() => setUnfinishedExpanded(!unfinishedExpanded)}
          />

          {unfinishedExpanded && (
            <div className="space-y-1 mt-1">
              {/* Unassigned todos */}
              {unassignedUnfinished.length > 0 && (
                <div className="space-y-1">
                  {unassignedUnfinished.map(todo => renderTodoItem(todo, true, true))}
                </div>
              )}

              {/* Work block grouped todos */}
              {workBlocks.map(block => {
                const blockTodos = getBlockUnfinished(block.id);
                if (blockTodos.length === 0) return null;

                return (
                  <div key={block.id}>
                    <BlockSubHeader block={block} count={blockTodos.length} />
                    <div className="space-y-1 ml-3">
                      {blockTodos.map(todo => renderTodoItem(todo, false, true))}
                    </div>
                  </div>
                );
              })}

              {unfinishedTodos.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2 px-2">No pending tasks</p>
              )}
            </div>
          )}
        </div>

        {/* Finished Section */}
        <div>
          <SectionHeader
            title="Finished"
            count={finishedTodos.length}
            expanded={finishedExpanded}
            onToggle={() => setFinishedExpanded(!finishedExpanded)}
            color="emerald"
          />

          {finishedExpanded && (
            <div className="space-y-1 mt-1">
              {finishedTodos.length > 0 ? (
                finishedTodos.map(todo => {
                  // Find the work block this todo belongs to
                  const block = workBlocks.find(b => b.id === todo.workBlockId);
                  return (
                    <div key={todo.id}>
                      {block && (
                        <div className="flex items-center gap-1 px-2 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${block.color || 'bg-indigo-500'}`} />
                          <span className="text-xs text-slate-400 truncate">{block.title}</span>
                        </div>
                      )}
                      {renderTodoItem(todo, false, true)}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic py-2 px-2">No completed tasks yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
