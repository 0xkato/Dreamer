import { useState } from 'react';
import { useCalendarStore, useProjectStore } from '../../store';
import { getTodayString, getDayName } from '../../types/calendar';

interface SpreadsheetPanelProps {
  weekStart: string;
  weekDays: string[]; // Array of 7 YYYY-MM-DD strings
}

interface AddItemState {
  isAdding: boolean;
  title: string;
  recurring: boolean;
  date: string | null; // For one-off items, which day
}

interface EditItemState {
  itemId: string;
  title: string;
}

const defaultAddState: AddItemState = {
  isAdding: false,
  title: '',
  recurring: true,
  date: null,
};

export function SpreadsheetPanel({ weekStart, weekDays }: SpreadsheetPanelProps) {
  const { currentProject } = useProjectStore();
  const {
    getSpreadsheetItemsForWeek,
    addSpreadsheetItem,
    updateSpreadsheetItem,
    deleteSpreadsheetItem,
    toggleSpreadsheetCompletion,
  } = useCalendarStore();

  const [addDoState, setAddDoState] = useState<AddItemState>({ ...defaultAddState });
  const [addDontState, setAddDontState] = useState<AddItemState>({ ...defaultAddState });
  const [editState, setEditState] = useState<EditItemState | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const today = getTodayString();
  const todayIndex = weekDays.indexOf(today);

  // Get items and split by type
  const allItems = getSpreadsheetItemsForWeek(weekStart);
  const doItems = allItems.filter(i => i.type === 'do');
  const dontItems = allItems.filter(i => i.type === 'dont');

  const projectPath = currentProject?.path;

  // Add item handler
  const handleAddItem = async (type: 'do' | 'dont', state: AddItemState, resetFn: (s: AddItemState) => void) => {
    if (!projectPath || !state.title.trim()) return;

    await addSpreadsheetItem(projectPath, {
      title: state.title.trim(),
      type,
      recurring: state.recurring,
      date: state.recurring ? null : (state.date || weekDays[0]),
      weekStart,
      completions: {},
    });

    resetFn({ ...defaultAddState });
  };

  // Edit handlers
  const handleStartEdit = (itemId: string, currentTitle: string) => {
    setEditState({ itemId, title: currentTitle });
  };

  const handleSaveEdit = async () => {
    if (!projectPath || !editState || !editState.title.trim()) return;
    await updateSpreadsheetItem(projectPath, editState.itemId, { title: editState.title.trim() });
    setEditState(null);
  };

  const handleCancelEdit = () => {
    setEditState(null);
  };

  // Delete handler
  const handleDelete = async (itemId: string) => {
    if (!projectPath) return;
    const item = allItems.find(i => i.id === itemId);
    if (item && Object.keys(item.completions).length > 0) {
      if (!window.confirm(`"${item.title}" has tracked completions. Delete anyway?`)) return;
    }
    await deleteSpreadsheetItem(projectPath, itemId);
  };

  // Toggle completion handler
  const handleToggle = async (itemId: string, date: string) => {
    if (!projectPath) return;
    await toggleSpreadsheetCompletion(projectPath, itemId, date);
  };

  // Calculate current streak for a recurring item
  const getStreak = (item: typeof allItems[0]): number => {
    if (!item.recurring) return 0;
    let streak = 0;
    // Walk backwards from today (or yesterday if today isn't checked yet)
    let checkDate = today;
    while (true) {
      if (item.completions[checkDate]) {
        streak++;
        // Go to previous day
        const d = new Date(checkDate + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      } else if (checkDate === today) {
        // Today not checked yet, start from yesterday
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      } else {
        break;
      }
    }
    return streak;
  };

  // Render a single item row
  const renderItemRow = (item: typeof allItems[0]) => {
    const isEditing = editState?.itemId === item.id;
    const isHovered = hoveredItemId === item.id;

    return (
      <tr
        key={item.id}
        className="hover:bg-slate-50 group"
        onMouseEnter={() => setHoveredItemId(item.id)}
        onMouseLeave={() => setHoveredItemId(null)}
      >
        {/* Title cell */}
        <td className="px-3 py-1.5 text-sm text-slate-700 w-[180px]">
          <div className="flex items-center gap-1">
            {isEditing ? (
              <input
                type="text"
                value={editState.title}
                onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                onBlur={handleSaveEdit}
                className="flex-1 px-2 py-0.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <>
                <span className="flex-1 truncate">{item.title}</span>
                {item.recurring && (() => {
                  const streak = getStreak(item);
                  return streak >= 2 ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex-shrink-0" title={`${streak}-day streak`}>
                      {streak}
                    </span>
                  ) : null;
                })()}
                {isHovered && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Edit button */}
                    <button
                      onClick={() => handleStartEdit(item.id, item.title)}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-0.5 text-slate-400 hover:text-red-500 rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </td>

        {/* Day cells */}
        {weekDays.map((date, idx) => {
          const isToday = idx === todayIndex;
          const showCheckbox = item.recurring || item.date === date;
          const isChecked = item.completions[date] === true;

          return (
            <td
              key={date}
              className={`text-center px-1 py-1.5 ${isToday ? 'bg-indigo-50/50' : ''}`}
            >
              {showCheckbox ? (
                <button
                  onClick={() => handleToggle(item.id, date)}
                  className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-colors ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {isChecked && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ) : null}
            </td>
          );
        })}
      </tr>
    );
  };

  // Render the add-item row
  const renderAddRow = (
    type: 'do' | 'dont',
    state: AddItemState,
    setState: (s: AddItemState) => void,
  ) => {
    if (!state.isAdding) {
      return (
        <tr>
          <td colSpan={8} className="px-3 py-1.5">
            <button
              onClick={() => setState({ ...state, isAdding: true })}
              className="text-sm text-slate-400 hover:text-indigo-500 transition-colors"
            >
              + Add item
            </button>
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td colSpan={8} className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={state.title}
              onChange={(e) => setState({ ...state, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem(type, state, setState);
                if (e.key === 'Escape') setState({ ...defaultAddState });
              }}
              placeholder="Item title..."
              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />

            {/* Recurring toggle */}
            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer select-none flex-shrink-0">
              <input
                type="checkbox"
                checked={state.recurring}
                onChange={(e) => setState({
                  ...state,
                  recurring: e.target.checked,
                  date: e.target.checked ? null : weekDays[0],
                })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Recurring
            </label>

            {/* Date picker for one-off items */}
            {!state.recurring && (
              <select
                value={state.date || weekDays[0]}
                onChange={(e) => setState({ ...state, date: e.target.value })}
                className="text-xs px-1.5 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {weekDays.map((date) => (
                  <option key={date} value={date}>
                    {getDayName(date)} {new Date(date).getDate()}
                  </option>
                ))}
              </select>
            )}

            {/* Cancel button */}
            <button
              onClick={() => setState({ ...defaultAddState })}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Render a section (DO or DON'T DO)
  const renderSection = (
    label: string,
    items: typeof allItems,
    type: 'do' | 'dont',
    addState: AddItemState,
    setAddState: (s: AddItemState) => void,
  ) => (
    <div className="mb-4">
      <table className="w-full border-collapse">
        <thead>
          {/* Section header row */}
          <tr className="border-b border-slate-200">
            <th className="text-left px-3 py-2 w-[180px]">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </span>
            </th>
            {weekDays.map((date, idx) => {
              const isToday = idx === todayIndex;
              const dayNum = new Date(date).getDate();
              return (
                <th
                  key={date}
                  className={`text-center px-1 py-2 text-xs text-slate-500 uppercase font-medium ${
                    isToday ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <div>{getDayName(date)}</div>
                  <div className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {dayNum}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map(item => renderItemRow(item))}
          {renderAddRow(type, addState, setAddState)}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-3">
      {renderSection('DO', doItems, 'do', addDoState, setAddDoState)}
      {renderSection("DON'T DO", dontItems, 'dont', addDontState, setAddDontState)}
    </div>
  );
}
