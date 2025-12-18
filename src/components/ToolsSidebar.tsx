import { useCanvasStore } from '../store';
import type { ToolType } from '../types';

interface ToolButtonProps {
  tool: ToolType;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

function ToolButton({ tool, label, icon, shortcut }: ToolButtonProps) {
  const { activeTool, setActiveTool } = useCanvasStore();
  const isActive = activeTool === tool;

  return (
    <button
      onClick={() => setActiveTool(tool)}
      className={`w-full p-2.5 flex flex-col items-center gap-1.5 rounded-xl transition-all ${
        isActive
          ? 'bg-indigo-50 text-indigo-600 shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
        isActive ? 'bg-indigo-100' : 'bg-transparent'
      }`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function ToolsSidebar() {
  return (
    <div className="w-[72px] bg-white border-r border-slate-200/80 flex flex-col py-3 px-2 gap-1 shadow-sm">
      <ToolButton
        tool="select"
        label="Select"
        shortcut="V"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        }
      />

      <div className="h-px bg-slate-100 my-2" />

      <ToolButton
        tool="rectangle"
        label="Rectangle"
        shortcut="R"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="4" width="16" height="16" rx="1" />
          </svg>
        }
      />

      <ToolButton
        tool="roundedRectangle"
        label="Rounded"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="4" width="16" height="16" rx="4" />
          </svg>
        }
      />

      <ToolButton
        tool="ellipse"
        label="Ellipse"
        shortcut="O"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="8" />
          </svg>
        }
      />

      <div className="h-px bg-slate-100 my-2" />

      <ToolButton
        tool="text"
        label="Text"
        shortcut="T"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
          </svg>
        }
      />

      <ToolButton
        tool="connector"
        label="Connect"
        shortcut="L"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M17 17h.01M7 7a2 2 0 012-2h.01M17 17a2 2 0 012-2h.01M7 7l10 10" />
          </svg>
        }
      />

      <div className="h-px bg-slate-100 my-2" />

      <ToolButton
        tool="freehand"
        label="Pen"
        shortcut="P"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        }
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Keyboard hints */}
      <div className="px-1 pt-3 border-t border-slate-100">
        <div className="text-[9px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Delete</span>
            <span className="text-slate-300">⌫</span>
          </div>
          <div className="flex justify-between">
            <span>Copy</span>
            <span className="text-slate-300">⌘C</span>
          </div>
          <div className="flex justify-between">
            <span>Paste</span>
            <span className="text-slate-300">⌘V</span>
          </div>
        </div>
      </div>
    </div>
  );
}
