import { useElementsStore } from '../store';
import type { ShapeElement, TextElement, ConnectorElement, DrawingElement, ShapeStyle, TextStyle, ConnectorStyle, DrawingStyle } from '../types';

export function PropertiesPanel() {
  const { elements, connectors, selectedIds, updateElement, updateConnector, pushHistory } = useElementsStore();

  const selectedElement = elements.find((e) => selectedIds.includes(e.id));
  const selectedConnector = connectors.find((c) => selectedIds.includes(c.id));

  if (!selectedElement && !selectedConnector) {
    return (
      <div className="w-64 bg-white border-l border-slate-200/80 p-5 shadow-sm">
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Select an element to<br />edit its properties</p>
        </div>
      </div>
    );
  }

  if (selectedElement && selectedElement.type === 'shape') {
    return (
      <ShapeProperties
        element={selectedElement}
        onUpdate={(updates) => {
          updateElement(selectedElement.id, updates);
          pushHistory();
        }}
      />
    );
  }

  if (selectedElement && selectedElement.type === 'text') {
    return (
      <TextProperties
        element={selectedElement}
        onUpdate={(updates) => {
          updateElement(selectedElement.id, updates);
          pushHistory();
        }}
      />
    );
  }

  if (selectedElement && selectedElement.type === 'drawing') {
    return (
      <DrawingProperties
        element={selectedElement}
        onUpdate={(updates) => {
          updateElement(selectedElement.id, updates);
          pushHistory();
        }}
      />
    );
  }

  if (selectedConnector) {
    return (
      <ConnectorProperties
        connector={selectedConnector}
        onUpdate={(updates) => {
          updateConnector(selectedConnector.id, updates);
          pushHistory();
        }}
      />
    );
  }

  return null;
}

function PropertyLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-500 mb-2">
      {children}
    </label>
  );
}

function PropertyRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <PropertyRow>
      <PropertyLabel>{label}</PropertyLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>
    </PropertyRow>
  );
}

function SliderInput({ value, onChange, label, min, max, unit = 'px' }: { value: number; onChange: (v: number) => void; label: string; min: number; max: number; unit?: string }) {
  return (
    <PropertyRow>
      <div className="flex justify-between items-center mb-2">
        <PropertyLabel>{label}</PropertyLabel>
        <span className="text-xs text-slate-600 font-medium">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </PropertyRow>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
        active
          ? 'bg-indigo-50 text-indigo-600 shadow-sm'
          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
      {children}
    </h4>
  );
}

function ShapeProperties({
  element,
  onUpdate,
}: {
  element: ShapeElement;
  onUpdate: (updates: Partial<ShapeElement>) => void;
}) {
  const { style, textStyle } = element;

  const updateStyle = (updates: Partial<ShapeStyle>) => {
    onUpdate({ style: { ...style, ...updates } });
  };

  const updateTextStyle = (updates: Partial<TextStyle>) => {
    onUpdate({ textStyle: { ...textStyle, ...updates } });
  };

  return (
    <div className="w-64 bg-white border-l border-slate-200/80 p-4 overflow-y-auto shadow-sm">
      <div className="panel-section">
        <SectionTitle>Shape</SectionTitle>
        <ColorInput label="Fill" value={style.fillColor} onChange={(v) => updateStyle({ fillColor: v })} />
        <ColorInput label="Border" value={style.strokeColor} onChange={(v) => updateStyle({ strokeColor: v })} />
        <SliderInput label="Border Width" value={style.strokeWidth} onChange={(v) => updateStyle({ strokeWidth: v })} min={0} max={10} />

        <PropertyRow>
          <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={style.shadow || false}
              onChange={(e) => updateStyle({ shadow: e.target.checked })}
              className="rounded"
            />
            Drop Shadow
          </label>
        </PropertyRow>
      </div>

      <div className="panel-section">
        <SectionTitle>Text</SectionTitle>
        <ColorInput label="Color" value={textStyle.color} onChange={(v) => updateTextStyle({ color: v })} />
        <SliderInput label="Size" value={textStyle.fontSize} onChange={(v) => updateTextStyle({ fontSize: v })} min={8} max={48} />

        <PropertyRow>
          <PropertyLabel>Style</PropertyLabel>
          <div className="flex gap-2">
            <ToggleButton active={textStyle.bold} onClick={() => updateTextStyle({ bold: !textStyle.bold })}>
              <strong>B</strong>
            </ToggleButton>
            <ToggleButton active={textStyle.italic} onClick={() => updateTextStyle({ italic: !textStyle.italic })}>
              <em>I</em>
            </ToggleButton>
          </div>
        </PropertyRow>
      </div>
    </div>
  );
}

function TextProperties({
  element,
  onUpdate,
}: {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
}) {
  const { textStyle } = element;

  const updateTextStyle = (updates: Partial<TextStyle>) => {
    onUpdate({ textStyle: { ...textStyle, ...updates } });
  };

  return (
    <div className="w-64 bg-white border-l border-slate-200/80 p-4 overflow-y-auto shadow-sm">
      <div className="panel-section">
        <SectionTitle>Text</SectionTitle>
        <ColorInput label="Color" value={textStyle.color} onChange={(v) => updateTextStyle({ color: v })} />
        <SliderInput label="Size" value={textStyle.fontSize} onChange={(v) => updateTextStyle({ fontSize: v })} min={8} max={72} />

        <PropertyRow>
          <PropertyLabel>Style</PropertyLabel>
          <div className="flex gap-2">
            <ToggleButton active={textStyle.bold} onClick={() => updateTextStyle({ bold: !textStyle.bold })}>
              <strong>B</strong>
            </ToggleButton>
            <ToggleButton active={textStyle.italic} onClick={() => updateTextStyle({ italic: !textStyle.italic })}>
              <em>I</em>
            </ToggleButton>
          </div>
        </PropertyRow>

        <PropertyRow>
          <PropertyLabel>Alignment</PropertyLabel>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => updateTextStyle({ align })}
                className={`flex-1 p-2 rounded-lg transition-all ${
                  textStyle.align === align
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {align === 'left' && (
                  <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
                  </svg>
                )}
                {align === 'center' && (
                  <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
                  </svg>
                )}
                {align === 'right' && (
                  <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </PropertyRow>
      </div>
    </div>
  );
}

function ConnectorProperties({
  connector,
  onUpdate,
}: {
  connector: ConnectorElement;
  onUpdate: (updates: Partial<ConnectorElement>) => void;
}) {
  const { style } = connector;

  const updateStyle = (updates: Partial<ConnectorStyle>) => {
    onUpdate({ style: { ...style, ...updates } });
  };

  return (
    <div className="w-64 bg-white border-l border-slate-200/80 p-4 overflow-y-auto shadow-sm">
      <div className="panel-section">
        <SectionTitle>Line</SectionTitle>
        <ColorInput label="Color" value={style.strokeColor} onChange={(v) => updateStyle({ strokeColor: v })} />
        <SliderInput label="Width" value={style.strokeWidth} onChange={(v) => updateStyle({ strokeWidth: v })} min={1} max={8} />

        <PropertyRow>
          <PropertyLabel>Style</PropertyLabel>
          <div className="flex gap-2">
            <ToggleButton active={style.lineStyle === 'solid'} onClick={() => updateStyle({ lineStyle: 'solid' })}>
              Solid
            </ToggleButton>
            <ToggleButton active={style.lineStyle === 'dashed'} onClick={() => updateStyle({ lineStyle: 'dashed' })}>
              Dashed
            </ToggleButton>
          </div>
        </PropertyRow>
      </div>

      <div className="panel-section">
        <SectionTitle>Arrows</SectionTitle>
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={style.arrowStart}
              onChange={(e) => updateStyle({ arrowStart: e.target.checked })}
              className="rounded"
            />
            Start Arrow
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={style.arrowEnd}
              onChange={(e) => updateStyle({ arrowEnd: e.target.checked })}
              className="rounded"
            />
            End Arrow
          </label>
        </div>
      </div>
    </div>
  );
}

function DrawingProperties({
  element,
  onUpdate,
}: {
  element: DrawingElement;
  onUpdate: (updates: Partial<DrawingElement>) => void;
}) {
  const { style } = element;

  const updateStyle = (updates: Partial<DrawingStyle>) => {
    onUpdate({ style: { ...style, ...updates } });
  };

  return (
    <div className="w-64 bg-white border-l border-slate-200/80 p-4 overflow-y-auto shadow-sm">
      <div className="panel-section">
        <SectionTitle>Stroke</SectionTitle>
        <ColorInput label="Color" value={style.strokeColor} onChange={(v) => updateStyle({ strokeColor: v })} />
        <SliderInput label="Width" value={style.strokeWidth} onChange={(v) => updateStyle({ strokeWidth: v })} min={1} max={20} />
        <SliderInput label="Opacity" value={Math.round(style.opacity * 100)} onChange={(v) => updateStyle({ opacity: v / 100 })} min={10} max={100} unit="%" />
      </div>
    </div>
  );
}
