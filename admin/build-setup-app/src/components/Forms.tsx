export { IdentityForm } from './forms/IdentityForm';
export { TypographyForm } from './forms/TypographyForm';
export { BackgroundForm } from './forms/BackgroundForm';
import { useConfigStore } from '@/lib/store';
import { Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_IMAGE_SHADOW,
  DEFAULT_IMAGE_EFFECTS,
  DEFAULT_IMAGE_CLICK,
  DEFAULT_LIGHTBOX,
  DEFAULT_CANVAS_EXPAND,
} from '@/lib/defaults';

function CompactColorPicker({ label, desc, value, onChange }: { label: string, desc: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3.5 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors bg-white gap-4 shadow-sm">
      <div className="flex flex-col gap-0.5 flex-1">
        <span className="font-semibold text-xs text-zinc-900">{label}</span>
        <span className="text-[10px] text-zinc-400 leading-normal">{desc}</span>
      </div>
      <div className="flex items-center gap-2 border border-zinc-200 rounded p-1 bg-zinc-50 hover:bg-zinc-100/50 hover:border-zinc-300 transition-all shrink-0">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-6 h-6 rounded cursor-pointer p-0 bg-transparent border border-zinc-200"
        />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-16 font-mono text-[10px] uppercase bg-transparent border-none outline-none focus:ring-0 text-center text-zinc-700 font-bold"
        />
      </div>
    </div>
  );
}

export function LayoutsForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  const handleToggleEnable = (mode: string, enabled: boolean) => {
    updateConfig(c => {
      let available = c.layouts.available || [];
      if (enabled) {
        if (!available.includes(mode)) available.push(mode);
      } else {
        available = available.filter(m => m !== mode);
      }
      
      const order = ["random", "rows", "stacks", "infinite"];
      c.layouts.available = order.filter(m => available.includes(m));

      const activeCount = c.layouts.available.length;
      
      if (activeCount === 1) {
        c.layouts.default = c.layouts.available[0];
        c.ui.modules.layouts.visible = false;
      } else if (activeCount > 1) {
        c.ui.modules.layouts.visible = true;
      }
      
      if (!c.layouts.available.includes(c.layouts.default) && activeCount > 0) {
        c.layouts.default = c.layouts.available[0];
      }
    });
  };

  const handleSetDefault = (mode: string, isDefault: boolean) => {
    if (!isDefault) return;
    updateConfig(c => {
      c.layouts.default = mode;
      if (!c.layouts.available.includes(mode)) {
        c.layouts.available.push(mode);
      const order = ["random", "rows", "stacks", "infinite"];
        c.layouts.available = order.filter(m => c.layouts.available.includes(m));
      }
      const activeCount = c.layouts.available.length;
      if (activeCount === 1) {
        c.ui.modules.layouts.visible = false;
      } else if (activeCount > 1) {
        c.ui.modules.layouts.visible = true;
      }
    });
  };

  const MODES = [
    { id: 'random', label: 'Random (Scattered)', desc: 'Scattered items on the canvas grid' },
    { id: 'rows', label: 'Rows (Masonry)', desc: 'Vertical height scale of image columns' },
    { id: 'stacks', label: 'Stacks (Depth)', desc: 'Depth distance spacing between depth-stacked slides' },
    { id: 'infinite', label: 'Infinite Grid', desc: 'Infinite panning masonry grid of repeating images' }
  ] as const;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Layout & Image Settings</h2>
        <p className="text-sm text-zinc-500 mb-6">Choose and fine-tune your portfolio canvas layout templates and image styles.</p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Layout Styles Settings</h3>

        {/* Universal Draggable Items Card */}
        <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="draggableEnabled" className="font-medium text-sm text-zinc-900 cursor-pointer">Draggable Items</Label>
              <span className="text-xs text-zinc-500">Allow visitors to drag and reposition media items on desktop</span>
            </div>
            <Switch 
              id="draggableEnabled"
              checked={config.layouts.draggable ?? config.layouts.random?.draggable ?? true}
              onCheckedChange={(v) => updateConfig(c => { 
                c.layouts.draggable = v;
                if (c.layouts.random) {
                  c.layouts.random.draggable = v; // Maintain sync with random.draggable for legacy reasons
                }
              })}
            />
          </div>
        </div>

        <Accordion multiple className="w-full space-y-4 pt-4">
          {MODES.map((modeData, idx) => {
            const mode = modeData.id;
            const isEnabled = config.layouts.available.includes(mode);
            const isDefault = config.layouts.default === mode;
            const isOnlyOne = config.layouts.available.length <= 1 && isEnabled;

            return (
              <AccordionItem key={mode} value={mode} className={`border rounded-lg overflow-hidden shadow-sm transition-all border-b-0 ${isEnabled ? 'border-zinc-200 bg-white data-[state=open]:border-zinc-300' : 'border-zinc-200 bg-zinc-50/50 opacity-50'}`}>
                <AccordionTrigger 
                  className="hover:no-underline px-4 py-4 flex flex-1 items-center justify-start gap-3 border-b border-zinc-100 bg-zinc-50/80 border-none !no-underline"
                  actions={
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                        <Label className="text-xs text-zinc-500 font-medium cursor-pointer">Default</Label>
                        <Switch 
                          checked={isDefault}
                          disabled={isOnlyOne || !isEnabled}
                          onCheckedChange={(v) => handleSetDefault(mode, v)}
                        />
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                        <Label className="text-xs text-zinc-500 font-medium cursor-pointer">Enabled</Label>
                        <Switch 
                          checked={isEnabled}
                          disabled={isOnlyOne} // Can't disable the last one
                          onCheckedChange={(v) => handleToggleEnable(mode, v)}
                        />
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col items-start gap-0.5 text-left flex-1">
                    <span className="font-semibold text-sm text-zinc-900 capitalize">{modeData.label}</span>
                    <span className="text-xs text-zinc-500 font-normal">{modeData.desc}</span>
                  </div>
                </AccordionTrigger>

                <AccordionContent className={!isEnabled ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                  <div className="p-4 space-y-6">
                    {/* Layout Name Input */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Layout Name</Label>
                        <span className="text-xs text-zinc-500">The name displayed for this layout in the view styles module</span>
                      </div>
                      <Input 
                        className="h-8 text-xs font-mono max-w-[240px]" 
                        value={config.layouts.labels[idx]} 
                        onChange={(e) => updateConfig(c => { c.layouts.labels[idx] = e.target.value })} 
                      />
                    </div>

                    {mode === 'random' && (
                      <div className="pt-4 border-t border-zinc-100 space-y-6">
                        {/* Scarcity Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Canvas Scarcity</span>
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.random.scarcity}px</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">Controls the density spacing between scattered items on the canvas grid</p>
                          <div className="flex items-center gap-4">
                            <Slider 
                              className="flex-1"
                              min={100} max={1000} step={10}
                              value={[config.layouts.random.scarcity]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { c.layouts.random.scarcity = num; });
                              }}
                            />
                          </div>
                        </div>

                        {/* Overlap Ratio Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Overlap Ratio</span>
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.random.overlapRatio}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">Determines how much media items can visually overlap on the canvas stage</p>
                          <div className="flex items-center gap-4">
                            <Slider 
                              className="flex-1"
                              min={0} max={0.8} step={0.05}
                              value={[config.layouts.random.overlapRatio]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { c.layouts.random.overlapRatio = num; });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {mode === 'rows' && (
                      <div className="pt-4 border-t border-zinc-100 space-y-6">
                        {/* Row Height Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Default Row Height</span>
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.rows.rowHeight}px</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">Controls the vertical height scale of image columns</p>
                          <div className="flex items-center gap-4">
                            <Slider 
                              className="flex-1"
                              min={150} max={500} step={10}
                              value={[config.layouts.rows.rowHeight]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { c.layouts.rows.rowHeight = num; });
                              }}
                            />
                          </div>
                        </div>

                        {/* Gap Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Grid Column Gap</span>
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.rows.gap}px</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">Horizontal spacing margins between items within row columns</p>
                          <div className="flex items-center gap-4">
                            <Slider 
                              className="flex-1"
                              min={0} max={80} step={4}
                              value={[config.layouts.rows.gap]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { c.layouts.rows.gap = num; });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {mode === 'stacks' && (
                      <div className="pt-4 border-t border-zinc-100 space-y-6">
                        {/* Spacing Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Stacks Column Spacing</span>
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.stacks.spacing}px</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">Depth distance spacing between depth-stacked visual slides</p>
                          <div className="flex items-center gap-4">
                            <Slider 
                              className="flex-1"
                              min={200} max={2000} step={50}
                              value={[config.layouts.stacks.spacing]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { c.layouts.stacks.spacing = num; });
                              }}
                            />
                          </div>
                        </div>

                        {/* Card Stacking Order Card */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-zinc-200 rounded-lg bg-zinc-50 gap-4 shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-xs text-zinc-900">Card Stacking Order</span>
                            <span className="text-[10px] text-zinc-500">Determine whether the top-left item is at the front or the back</span>
                          </div>
                          <Select 
                            value={config.layouts.stacks.depthOrder ?? 'front-to-back'} 
                            onValueChange={(v) => updateConfig(c => { 
                              if (!c.layouts.stacks) c.layouts.stacks = { spacing: 1000, depthOrder: 'front-to-back' };
                              c.layouts.stacks.depthOrder = v || 'front-to-back';
                            })}
                          >
                            <SelectTrigger className="w-[160px] h-8 border-zinc-200 text-[11px] font-semibold bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="front-to-back" className="text-[11px] font-medium">Top-Left is Front</SelectItem>
                              <SelectItem value="back-to-front" className="text-[11px] font-medium">Top-Left is Back</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {mode === 'infinite' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-4 p-4 border border-zinc-200 rounded-lg bg-zinc-50 shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-xs text-zinc-900">Column Width</span>
                            <span className="text-[10px] text-zinc-500">Base width of each column (100–1200px)</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.infinite?.columnWidth ?? 520}px</span>
                            <Slider
                              className="flex-1"
                              min={100} max={1200} step={10}
                              value={[config.layouts.infinite?.columnWidth ?? 520]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => {
                                  if (!c.layouts.infinite) c.layouts.infinite = { columnWidth: 520, gap: 8, numCols: 6 };
                                  c.layouts.infinite.columnWidth = num;
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 p-4 border border-zinc-200 rounded-lg bg-zinc-50 shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-xs text-zinc-900">Item Gap</span>
                            <span className="text-[10px] text-zinc-500">Spacing between items (0–64px)</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.infinite?.gap ?? 8}px</span>
                            <Slider
                              className="flex-1"
                              min={0} max={64} step={2}
                              value={[config.layouts.infinite?.gap ?? 8]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => {
                                  if (!c.layouts.infinite) c.layouts.infinite = { columnWidth: 520, gap: 8, numCols: 6 };
                                  c.layouts.infinite.gap = num;
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 p-4 border border-zinc-200 rounded-lg bg-zinc-50 shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-xs text-zinc-900">Number of Columns</span>
                            <span className="text-[10px] text-zinc-500">How many columns in one repeating tile (1–12)</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{config.layouts.infinite?.numCols ?? 6}</span>
                            <Slider
                              className="flex-1"
                              min={1} max={12} step={1}
                              value={[config.layouts.infinite?.numCols ?? 6]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => {
                                  if (!c.layouts.infinite) c.layouts.infinite = { columnWidth: 520, gap: 8, numCols: 6 };
                                  c.layouts.infinite.numCols = num;
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

const ZONE_GRID = [
  ['top-left', 'top-center', 'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right']
];

const MODULE_LABELS: Record<string, string> = {
  title: 'Site Title',
  email: 'Email',
  externalLinks: 'External Links',
  info: 'Info Button',
  categories: 'Category Filters',
  layouts: 'Layout Modes',
  zoom: 'Zoom Controls'
};

const ZONES = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'middle-left', label: 'Middle Left' },
  { value: 'middle-center', label: 'Middle Center' },
  { value: 'middle-right', label: 'Middle Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' }
];

export function ModulesForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  // Compute occupied zones
  const occupied: Record<string, string[]> = {};
  ['title', 'email', 'info', 'categories', 'layouts'].forEach(k => {
    const mod = config.ui.modules[k as keyof typeof config.ui.modules];
    if (mod?.visible && mod?.position) {
      if (!occupied[mod.position]) occupied[mod.position] = [];
      occupied[mod.position].push(k);
    }
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Modules Layout</h2>
        <p className="text-sm text-zinc-500 mb-6">Position and toggle individual canvas interface modules.</p>
      </div>

      {/* 3x3 Semantic Canvas Grid */}
      <div className="p-6 border border-zinc-200 rounded-lg bg-zinc-50/50 space-y-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Semantic Canvas Grid (Desktop)</h3>
        
        <div className="grid grid-cols-3 gap-2 mx-auto max-w-md aspect-[3/1.3]">
          {ZONE_GRID.flat().map((zone) => {
            const isCenter = zone === 'middle-center';
            const items = occupied[zone] || [];
            const isOccupied = items.length > 0;
            
            if (isCenter) {
              return (
                <div 
                  key={zone} 
                  className="flex items-center justify-center border border-dashed border-zinc-200 bg-zinc-100/30 rounded text-[10px] text-zinc-400 font-medium select-none"
                >
                  Canvas Center
                </div>
              );
            }
            
            return (
              <div 
                key={zone} 
                className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${
                  isOccupied 
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm' 
                    : 'border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <span className={`text-[9px] font-medium tracking-tight uppercase ${isOccupied ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  {zone.replace('middle-', 'mid-').replace('bottom-', 'btm-')}
                </span>
                {isOccupied && (
                  <div className="mt-1 flex flex-wrap justify-center gap-1 max-w-full">
                    {items.map(k => (
                      <span key={k} className="bg-zinc-800 text-white px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wide">
                        {MODULE_LABELS[k] || k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <p className="text-[11px] text-zinc-500 text-center leading-relaxed max-w-md mx-auto">
          The diagram above represents the 9-zone overlay of your desktop portfolio. Gray blocks show currently active modules at their respective screen anchors.
        </p>
      </div>

      <Accordion className="mb-8">
        <AccordionItem value="global" className="border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors bg-white overflow-hidden shadow-sm">
          <AccordionTrigger className="px-4 py-4 hover:no-underline">
            <div className="flex flex-col gap-0.5 text-left">
              <span className="font-medium text-sm text-zinc-900">Global Settings</span>
              <span className="text-xs text-zinc-500">Configure enclosing characters for all modules</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-4 pb-4 flex gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="global-prefix" className="text-xs font-medium text-zinc-900">Prefix Character</Label>
                <Input 
                  id="global-prefix"
                  value={config.ui.module_prefix ?? "["}
                  onChange={(e) => updateConfig(c => { c.ui.module_prefix = e.target.value })}
                  placeholder="e.g. ["
                  className="bg-white"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="global-suffix" className="text-xs font-medium text-zinc-900">Suffix Character</Label>
                <Input 
                  id="global-suffix"
                  value={config.ui.module_suffix ?? "]"}
                  onChange={(e) => updateConfig(c => { c.ui.module_suffix = e.target.value })}
                  placeholder="e.g. ]"
                  className="bg-white"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion multiple className="space-y-4">
        {['title', 'email', 'externalLinks', 'info', 'categories', 'layouts', 'zoom'].map((modKey) => {
          const mod = config.ui.modules[modKey as keyof typeof config.ui.modules];
          const isLayoutsForcedOff = modKey === 'layouts' && config.layouts.available.length <= 1;

          return (
            <AccordionItem key={modKey} value={modKey} disabled={isLayoutsForcedOff} className={`flex flex-col border border-zinc-200 rounded-lg transition-colors overflow-hidden shadow-sm border-b-0 ${isLayoutsForcedOff ? 'opacity-50 pointer-events-none bg-zinc-50/50' : 'bg-white hover:border-zinc-300 data-[state=open]:border-zinc-300'}`}>
              <AccordionTrigger 
                className="px-4 py-4 hover:no-underline flex flex-1 items-center justify-start gap-3 w-full"
                actions={
                  <div 
                    className="flex items-center gap-4 shrink-0" 
                    onClick={(e) => e.stopPropagation()} 
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Select 
                      value={mod.position} 
                      disabled={!mod.visible || isLayoutsForcedOff}
                      onValueChange={(v) => updateConfig(c => { c.ui.modules[modKey as keyof typeof config.ui.modules].position = v as string })}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs font-medium border-zinc-200 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ZONES.map(z => <SelectItem key={z.value} value={z.value} className="text-xs font-medium">{z.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Switch 
                      checked={mod.visible} 
                      disabled={isLayoutsForcedOff}
                      onCheckedChange={(v) => updateConfig(c => { c.ui.modules[modKey as keyof typeof config.ui.modules].visible = v })}
                    />
                  </div>
                }
              >
                <div className="flex flex-col gap-0.5 text-left flex-1">
                  <span className="font-medium text-sm text-zinc-900">{MODULE_LABELS[modKey] || modKey}</span>
                  <span className="text-xs text-zinc-500">
                    {isLayoutsForcedOff ? "Requires multiple active layout modes" : "Toggle visibility and canvas location"}
                  </span>
                </div>
              </AccordionTrigger>

              {/* Module-specific options inside AccordionContent */}
              <AccordionContent className={!mod.visible ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                <div className="px-4 pb-4 flex flex-col gap-4">
              
              {modKey === 'title' && (
                <div className="pt-4 border-t border-zinc-100 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Appearance Mode</Label>
                    <RadioGroup 
                      value={config.ui.modules.title.mode || 'text'}
                      onValueChange={(v) => updateConfig(c => { 
                        if (!c.ui.modules.title.mode) c.ui.modules.title.mode = 'text';
                        c.ui.modules.title.mode = v;
                      })}
                      className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-lg border border-zinc-100"
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="text" id="title-mode-text" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="title-mode-text" className="text-sm font-medium cursor-pointer">Text Only</Label>
                          <span className="text-xs text-zinc-500">Displays the Site Title text.</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="svg" id="title-mode-svg" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="title-mode-svg" className="text-sm font-medium cursor-pointer">SVG Logo Only</Label>
                          <span className="text-xs text-zinc-500">Replaces text with your SVG logo.</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="svg_text" id="title-mode-svg-text" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="title-mode-svg-text" className="text-sm font-medium cursor-pointer">SVG Logo + Text</Label>
                          <span className="text-xs text-zinc-500">Shows the SVG icon followed by the text.</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="text_svg" id="title-mode-text-svg" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="title-mode-text-svg" className="text-sm font-medium cursor-pointer">Text + SVG Logo</Label>
                          <span className="text-xs text-zinc-500">Shows the text followed by the SVG icon.</span>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {config.ui.modules.title.mode !== 'text' && (
                    <div className="space-y-3 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="title-logo-file" className="text-sm font-medium text-zinc-900">SVG File Path</Label>
                        <span className="text-xs text-zinc-500 leading-relaxed">
                          Path to your SVG file (e.g., <code className="bg-zinc-200/50 px-1 py-0.5 rounded">assets/logo.svg</code>).
                        </span>
                      </div>
                      <Input 
                        id="title-logo-file"
                        value={config.ui.modules.title.logoFile || ''}
                        onChange={(e) => updateConfig(c => { c.ui.modules.title.logoFile = e.target.value })}
                        placeholder="assets/logo.svg"
                        className="bg-white"
                      />
                      <div className="flex flex-col gap-1 mt-2">
                        <Label className="text-sm font-medium text-zinc-900">SVG Scale</Label>
                        <span className="text-xs text-zinc-500 leading-relaxed">
                          Adjust the relative size of the SVG logo.
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Slider 
                          min={0.8}
                          max={2.5}
                          step={0.1}
                          value={[config.ui.modules.title.logoScale ?? 0.8]}
                          onValueChange={(val: number | readonly number[]) => updateConfig(c => { c.ui.modules.title.logoScale = Array.isArray(val) ? val[0] : val; })}
                          className="flex-1"
                        />
                        <span className="text-xs font-medium text-zinc-600 w-8">{config.ui.modules.title.logoScale ?? 0.8}em</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {modKey === 'email' && (
                <div className="pt-4 border-t border-zinc-100 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Button Label</Label>
                    <RadioGroup 
                      value={config.ui.modules.email.labelMode || 'email'}
                      onValueChange={(v) => updateConfig(c => { 
                        if (!c.ui.modules.email.labelMode) c.ui.modules.email.labelMode = 'email';
                        c.ui.modules.email.labelMode = v as 'email' | 'custom';
                      })}
                      className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-lg border border-zinc-100"
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="email" id="email-label-email" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="email-label-email" className="text-sm font-medium cursor-pointer">Email Address</Label>
                          <span className="text-xs text-zinc-500">Shows your actual email address.</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="custom" id="email-label-custom" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="email-label-custom" className="text-sm font-medium cursor-pointer">Custom Word</Label>
                          <span className="text-xs text-zinc-500">Shows a custom word (e.g. Contact).</span>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  {config.ui.modules.email.labelMode === 'custom' && (
                    <div className="space-y-3 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                      <Label htmlFor="email-custom-label" className="text-sm font-medium text-zinc-900">Custom Word</Label>
                      <Input 
                        id="email-custom-label"
                        value={config.ui.modules.email.customLabel || 'Contact'}
                        onChange={(e) => updateConfig(c => { c.ui.modules.email.customLabel = e.target.value })}
                        placeholder="Contact"
                        className="bg-white max-w-[240px]"
                      />
                    </div>
                  )}
                </div>
              )}
              {modKey === 'externalLinks' && (
                <div className="pt-4 border-t border-zinc-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Links</Label>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig(c => {
                          if (!c.ui.modules.externalLinks.links) c.ui.modules.externalLinks.links = [];
                          c.ui.modules.externalLinks.links.push({ id: crypto.randomUUID(), url: '', label: '' });
                        });
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Link
                    </button>
                  </div>
                  <div className="space-y-3">
                    {config.ui.modules.externalLinks.links?.length > 0 ? (
                      config.ui.modules.externalLinks.links.map((link, idx) => (
                        <div key={link.id} className="flex flex-col gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-zinc-500 uppercase">URL</Label>
                                <Input 
                                  className="h-8 text-xs bg-white" 
                                  placeholder="https://example.com"
                                  value={link.url}
                                  onChange={(e) => updateConfig(c => { c.ui.modules.externalLinks.links[idx].url = e.target.value; })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-zinc-500 uppercase">Label (Optional)</Label>
                                <Input 
                                  className="h-8 text-xs bg-white" 
                                  placeholder="My Blog"
                                  value={link.label}
                                  onChange={(e) => updateConfig(c => { c.ui.modules.externalLinks.links[idx].label = e.target.value; })}
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateConfig(c => { c.ui.modules.externalLinks.links.splice(idx, 1); })}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                              title="Delete Link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-lg">
                        No external links added yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
              {modKey === 'info' && (
                <div className="pt-4 border-t border-zinc-100 space-y-6">
                  {/* Info Button Label */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Button Label</Label>
                    <Input 
                      className="h-8 text-sm max-w-[240px]" 
                      value={(config.ui.modules.info as any).label ?? 'INFO'} 
                      onChange={(e) => updateConfig(c => { c.ui.modules.info.label = e.target.value })} 
                    />
                  </div>
                  {/* Info Button Style */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Button Style</Label>
                    <RadioGroup 
                      value={config.ui.modules.info.buttonStyle || 'static'}
                      onValueChange={(v) => updateConfig(c => { 
                        if (!c.ui.modules.info.buttonStyle) c.ui.modules.info.buttonStyle = 'static';
                        c.ui.modules.info.buttonStyle = v;
                      })}
                      className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-lg border border-zinc-100"
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="static" id="info-btn-static" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="info-btn-static" className="text-sm font-medium cursor-pointer">Static (Default)</Label>
                          <span className="text-xs text-zinc-500">INFO always displays as INFO.</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="strikethrough" id="info-btn-strike" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="info-btn-strike" className="text-sm font-medium cursor-pointer">Strikethrough</Label>
                          <span className="text-xs text-zinc-500">INFO is crossed out when the overlay is closed.</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="x-close" id="info-btn-x" className="mt-0.5" />
                        <div className="flex flex-col">
                          <Label htmlFor="info-btn-x" className="text-sm font-medium cursor-pointer">X Close</Label>
                          <span className="text-xs text-zinc-500">INFO displays as × when the overlay is open.</span>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Overlay Effect</Label>
                    <RadioGroup 
                      value={config.ui.modules.info.overlayEffect || 'none'}
                      onValueChange={(v) => updateConfig(c => { 
                        if (!c.ui.modules.info.overlayEffect) c.ui.modules.info.overlayEffect = 'none';
                        c.ui.modules.info.overlayEffect = v;
                      })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="info-overlay-none" />
                        <Label htmlFor="info-overlay-none" className="text-sm font-normal cursor-pointer">None</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="colour-overlay" id="info-overlay-color" />
                        <Label htmlFor="info-overlay-color" className="text-sm font-normal cursor-pointer">Overlay</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {config.ui.modules.info.overlayEffect === 'colour-overlay' && (
                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 space-y-4">
                      <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">Overlay Settings</h4>
                      <CompactColorPicker 
                        label="Overlay Color"
                        desc="Background color behind the info panel"
                        value={config.ui.modules.info.overlayColor || '#000000'}
                        onChange={(val) => updateConfig(c => {
                          c.ui.modules.info.overlayColor = val;
                        })}
                      />

                      <div className="space-y-2 p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-zinc-900">Overlay Opacity</span>
                          <span className="text-xs font-bold text-zinc-600">
                            {Math.round((config.ui.modules.info.overlayOpacity ?? 0.75) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">Control the transparency of the background overlay</p>
                        <Slider 
                          min={0}
                          max={1}
                          step={0.01}
                          value={[config.ui.modules.info.overlayOpacity ?? 0.75]}
                          onValueChange={(val) => updateConfig(c => {
                            const v = Array.isArray(val) ? val[0] : val;
                            c.ui.modules.info.overlayOpacity = typeof v === 'number' ? v : 0.75;
                          })}
                          className="py-2"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3.5 border border-zinc-200 rounded-lg bg-white gap-4 shadow-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs text-zinc-900">Overlay Blend Mode</span>
                          <span className="text-[10px] text-zinc-400 leading-normal">Blend the overlay with background elements</span>
                        </div>
                        <Select 
                          value={config.ui.modules.info.overlayBlendMode || 'normal'} 
                          onValueChange={(v) => updateConfig(c => { 
                            c.ui.modules.info.overlayBlendMode = v || 'normal';
                          })}
                        >
                          <SelectTrigger className="w-[150px] h-8 border-zinc-200 text-xs font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'].map(mode => (
                              <SelectItem key={mode} value={mode} className="text-xs font-medium">
                                {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(modKey === 'categories' || modKey === 'layouts' || modKey === 'zoom') && (() => {
                const modConfig = config.ui.modules[modKey as 'categories' | 'layouts' | 'zoom'];
                return (
                  <div className="pt-4 border-t border-zinc-100 space-y-6">
                    {modKey === 'categories' && (
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Behavior</Label>
                        <RadioGroup 
                          value={config.ui.modules.categories.behaviour || 'hide-on-click'}
                          onValueChange={(v) => updateConfig(c => { 
                            if (!c.ui.modules.categories.behaviour) c.ui.modules.categories.behaviour = 'hide-on-click';
                            c.ui.modules.categories.behaviour = v;
                          })}
                          className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-lg border border-zinc-100"
                        >
                          <div className="flex items-start space-x-3">
                            <RadioGroupItem value="hide-on-click" id="cat-beh-hide" className="mt-0.5" />
                            <div className="flex flex-col">
                              <Label htmlFor="cat-beh-hide" className="text-sm font-medium cursor-pointer">Hide on Click</Label>
                              <span className="text-xs text-zinc-500">Clicked categories are hidden. Click again to un-hide.</span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <RadioGroupItem value="focus-on-click" id="cat-beh-focus" className="mt-0.5" />
                            <div className="flex flex-col">
                              <Label htmlFor="cat-beh-focus" className="text-sm font-medium cursor-pointer">Focus on Click</Label>
                              <span className="text-xs text-zinc-500">Only the clicked category is shown (others are crossed out). Click again to show all.</span>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {/* Layout (Horizontal/Vertical) */}
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Layout</Label>
                      <RadioGroup 
                        value={modConfig.layout || 'vertical'}
                        onValueChange={(v) => updateConfig(c => { 
                          const target = c.ui.modules[modKey as 'categories' | 'layouts' | 'zoom'];
                          if (!target.layout) target.layout = 'vertical';
                          target.layout = v;
                        })}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="vertical" id={`${modKey}-vert`} />
                          <Label htmlFor={`${modKey}-vert`} className="text-sm font-normal cursor-pointer">Vertical (Stacked)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="horizontal" id={`${modKey}-horiz`} />
                          <Label htmlFor={`${modKey}-horiz`} className="text-sm font-normal cursor-pointer">Horizontal (Side by Side)</Label>
                        </div>
                        {modKey === 'zoom' && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="full-width" id={`${modKey}-full`} />
                            <Label htmlFor={`${modKey}-full`} className="text-sm font-normal cursor-pointer">Full Width</Label>
                          </div>
                        )}
                      </RadioGroup>
                    </div>

                    {(modConfig.layout === 'horizontal' || modConfig.layout === 'full-width') ? (
                      <div className="grid grid-cols-2 gap-6 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                        {/* Separator Input */}
                        <div className="space-y-2">
                          <Label htmlFor={`${modKey}-sep`} className="text-xs font-medium">Separator Character</Label>
                          <Input 
                            id={`${modKey}-sep`}
                            className="h-8 text-sm"
                            value={modConfig.separator ?? '|'}
                            onChange={(e) => updateConfig(c => { c.ui.modules[modKey as 'categories' | 'layouts' | 'zoom'].separator = e.target.value })}
                            placeholder="e.g. | or /"
                          />
                        </div>
                        {/* Spacing Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Spacing</span>
                          </div>
                          <div className="flex items-center h-8">
                            <Slider 
                              className="flex-1"
                              min={0} max={40} step={2}
                      value={[modConfig.spacing ?? 10]}
                              onValueChange={(val: number | readonly number[]) => {
                                const v = Array.isArray(val) ? val[0] : val;
                                updateConfig(c => { c.ui.modules[modKey as 'categories' | 'layouts' | 'zoom'].spacing = v })
                              }}
                            />
                          </div>
                        </div>
                        {modKey === 'zoom' && (
                          <div className="col-span-2 space-y-3 pt-4 mt-2 border-t border-zinc-100">
                            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Button Labels</Label>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-zinc-500">Zoom Out</Label>
                                <Input className="h-8 text-xs" value={(modConfig as any).labels?.[0] ?? '-'} onChange={(e) => updateConfig(c => { 
                                  if (!c.ui.modules.zoom.labels) c.ui.modules.zoom.labels = ['-', '0', '+'];
                                  c.ui.modules.zoom.labels[0] = e.target.value;
                                })} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-zinc-500">Reset</Label>
                                <Input className="h-8 text-xs" value={(modConfig as any).labels?.[1] ?? '0'} onChange={(e) => updateConfig(c => { 
                                  if (!c.ui.modules.zoom.labels) c.ui.modules.zoom.labels = ['-', '0', '+'];
                                  c.ui.modules.zoom.labels[1] = e.target.value;
                                })} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-zinc-500">Zoom In</Label>
                                <Input className="h-8 text-xs" value={(modConfig as any).labels?.[2] ?? '+'} onChange={(e) => updateConfig(c => { 
                                  if (!c.ui.modules.zoom.labels) c.ui.modules.zoom.labels = ['-', '0', '+'];
                                  c.ui.modules.zoom.labels[2] = e.target.value;
                                })} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 space-y-3">
                        <Label className="text-xs font-medium">Text Alignment</Label>
                        <RadioGroup 
                          value={modConfig.alignment || 'left'}
                          onValueChange={(v) => updateConfig(c => { 
                            const target = c.ui.modules[modKey as 'categories' | 'layouts'];
                            if (!target.alignment) target.alignment = 'left';
                            target.alignment = v;
                          })}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="left" id={`${modKey}-align-left`} />
                            <Label htmlFor={`${modKey}-align-left`} className="text-sm font-normal cursor-pointer">Left</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="center" id={`${modKey}-align-center`} />
                            <Label htmlFor={`${modKey}-align-center`} className="text-sm font-normal cursor-pointer">Center</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="right" id={`${modKey}-align-right`} />
                            <Label htmlFor={`${modKey}-align-right`} className="text-sm font-normal cursor-pointer">Right</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                );
              })()}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>


    </div>
  );
}



export function HelpForm() {
  const { buildSite, isBuilding } = useConfigStore();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Setup Guide</h2>
        <p className="text-sm text-zinc-500 mb-6">Learn how to manage, populate and deploy your new portfolio.</p>
      </div>

      <div className="p-6 border border-zinc-200 rounded-lg bg-white space-y-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold">1</span>
          How to Add Your Images & Videos
        </h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Adding your projects to the visual canvas is completely file-based:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-600">
          <li className="leading-relaxed">
            Navigate to the <code className="bg-zinc-100 px-1 rounded text-xs font-mono">assets/images/</code> folder.
          </li>
          <li className="leading-relaxed">
            Create folders. Each folder name automatically becomes a category.
          </li>
          <li className="leading-relaxed">
            Drop your project files inside (<code className="bg-zinc-100 px-1 rounded text-xs font-mono">.jpg</code>, <code className="bg-zinc-100 px-1 rounded text-xs font-mono">.png</code>, <code className="bg-zinc-100 px-1 rounded text-xs font-mono">.webp</code>, <code className="bg-zinc-100 px-1 rounded text-xs font-mono">.avif</code>, <code className="bg-zinc-100 px-1 rounded text-xs font-mono">.mp4</code>).
          </li>
          <li className="leading-relaxed">
            <strong className="font-semibold text-zinc-900">External Videos:</strong> You can also create a <code className="bg-zinc-100 px-1 rounded text-xs font-mono">videos.txt</code> file in any category folder. Paste YouTube or Vimeo URLs inside it (one URL per line) to embed them.
          </li>
        </ol>
      </div>

      <div className="p-6 border border-zinc-200 rounded-lg bg-white space-y-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold">2</span>
          Favicon & Social Assets
        </h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Use the free online tool <a href="https://realfavicongenerator.net" target="_blank" rel="noopener noreferrer" className="text-zinc-900 underline font-medium hover:text-zinc-600">realfavicongenerator.net</a> to generate favicons from a square 512×512px image, and extract them to the <code className="bg-zinc-100 px-1 rounded text-xs font-mono">favicon/</code> directory. For social sharing, place a 1200×630px image named <code className="bg-zinc-100 px-1 rounded text-xs font-mono">og-image.jpg</code> in the project's root folder.
        </p>
      </div>

      <div className="p-6 border border-zinc-200 rounded-lg bg-white space-y-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold">3</span>
          Generate Production Build
        </h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Before deploying, you must build the static files. This generates the <code>data.js</code> file from your <code>assets/images</code> folder, and updates all HTML meta tags.
        </p>
        <Button onClick={() => buildSite()} disabled={isBuilding}>
          {isBuilding ? 'Building...' : 'Rebuild Now'}
        </Button>
      </div>

      <div className="p-6 border border-zinc-200 rounded-lg bg-white space-y-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold">4</span>
          Deploy to Any Static Host
        </h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Upload your project folder to any static hosting provider (e.g., Cloudflare Pages, Netlify, Vercel, or GitHub Pages). 
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600">
          <li className="leading-relaxed">No build command is required on the server.</li>
          <li className="leading-relaxed">Set the Publish/Output Directory to the root directory (<code className="bg-zinc-100 px-1 rounded text-xs font-mono">/</code> or <code className="bg-zinc-100 px-1 rounded text-xs font-mono">.</code>) depending on your host.</li>
        </ul>
      </div>
    </div>
  );
}


export function ImageSettingsForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Image Settings</h2>
        <p className="text-sm text-zinc-500 mb-6">Manage image styles, hover effects, and click actions.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4">Image Effects</h3>
          <p className="text-xs text-zinc-500 mb-4">Visual style applied to images initially and on hover.</p>
        </div>

        {/* 1. Image Drop Shadow Card */}
        <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="shadowEnabled" className="font-medium text-sm text-zinc-900 cursor-pointer">Image Drop Shadow</Label>
              <span className="text-xs text-zinc-500">Add elegant soft shadow offsets behind media cards</span>
            </div>
            <Switch 
              id="shadowEnabled" 
              checked={config.theme.imageShadow?.enabled !== false}
              onCheckedChange={(v) => updateConfig(c => { 
                if (!c.theme.imageShadow) c.theme.imageShadow = { ...DEFAULT_IMAGE_SHADOW };
                c.theme.imageShadow.enabled = v; 
              })}
            />
          </div>

          {(config.theme.imageShadow?.enabled !== false) && (
            <div className="pt-4 mt-4 border-t border-zinc-200/60 space-y-6">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shadow Settings</h4>
              
              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700">Shadow Opacity</span>
                  <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold">{(config.theme.imageShadow?.opacity ?? 0.06)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider 
                    className="flex-1"
                    min={0.01} max={0.4} step={0.01}
                    value={[config.theme.imageShadow?.opacity ?? 0.06]}
                    onValueChange={(val: number | readonly number[]) => {
                      const num = Array.isArray(val) ? val[0] : (val as number);
                      updateConfig(c => { 
                        if (!c.theme.imageShadow) c.theme.imageShadow = { ...DEFAULT_IMAGE_SHADOW };
                        c.theme.imageShadow.opacity = num; 
                      });
                    }}
                  />
                </div>
              </div>

              {/* Blur Size */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700">Shadow Size / Blur</span>
                  <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold">{(config.theme.imageShadow?.blur ?? 30)}px</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider 
                    className="flex-1"
                    min={5} max={80} step={2}
                    value={[config.theme.imageShadow?.blur ?? 30]}
                    onValueChange={(val: number | readonly number[]) => {
                      const num = Array.isArray(val) ? val[0] : (val as number);
                      updateConfig(c => { 
                        if (!c.theme.imageShadow) c.theme.imageShadow = { ...DEFAULT_IMAGE_SHADOW };
                        c.theme.imageShadow.blur = num; 
                      });
                    }}
                  />
                </div>
              </div>

              {/* Shadow Colour */}
              <CompactColorPicker 
                label="Shadow Color"
                desc="The tint color of the image drop shadow"
                value={config.theme.imageShadow?.color || '#000000'}
                onChange={(val) => updateConfig(c => {
                  if (!c.theme.imageShadow) c.theme.imageShadow = { ...DEFAULT_IMAGE_SHADOW };
                  c.theme.imageShadow.color = val;
                })}
              />
            </div>
          )}
        </div>

        {/* 2. Image Default State Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-zinc-200 rounded-lg bg-white gap-4 shadow-sm hover:border-zinc-300 transition-colors">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm text-zinc-900">Image Default State</span>
            <span className="text-xs text-zinc-500">Visual style applied to images initially</span>
          </div>
          <Select 
            value={config.imageEffects?.initialState || 'colour'} 
            onValueChange={(v) => updateConfig(c => { 
              if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
              c.imageEffects.initialState = v || 'colour';
            })}
          >
            <SelectTrigger className="w-[180px] h-9 border-zinc-200 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="colour" className="text-xs font-medium">Normal (Default Color)</SelectItem>
              <SelectItem value="desaturated" className="text-xs font-medium">Desaturated (Grayscale)</SelectItem>
              <SelectItem value="duotone" className="text-xs font-medium">Two Tone (Duotone)</SelectItem>
              <SelectItem value="blurred" className="text-xs font-medium">Blurred</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sub-options for Duotone (Two Tone) */}
        {config.imageEffects?.initialState === 'duotone' && (
          <div className="pl-6 py-2 border-l-2 border-zinc-200 space-y-4 bg-zinc-50/10 rounded-r-lg">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Two-Tone Custom Colors</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompactColorPicker 
                label="Shadow Color"
                desc="Darker tone replacement (shadows)"
                value={config.imageEffects.duotoneColor1 || '#000000'}
                onChange={(val) => updateConfig(c => {
                  if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
                  c.imageEffects.duotoneColor1 = val;
                })}
              />
              <CompactColorPicker 
                label="Highlight Color"
                desc="Lighter tone replacement (highlights)"
                value={config.imageEffects.duotoneColor2 || '#ffffff'}
                onChange={(val) => updateConfig(c => {
                  if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
                  c.imageEffects.duotoneColor2 = val;
                })}
              />
            </div>
          </div>
        )}

        {/* 3. Slightly Enlarge on Hover Switch */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-zinc-200 rounded-lg bg-white gap-4 shadow-sm hover:border-zinc-300 transition-colors">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm text-zinc-900">Slightly Enlarge on Hover</span>
            <span className="text-xs text-zinc-500">Scale the image up slightly on hover and drag</span>
          </div>
          <Switch 
            checked={config.imageEffects?.enlargeOnHover || false} 
            onCheckedChange={(checked) => updateConfig(c => { 
              if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
              c.imageEffects.enlargeOnHover = checked;
            })}
          />
        </div>

        {/* 3.5 Rounded Corners */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-zinc-200 rounded-lg bg-white shadow-sm hover:border-zinc-300 transition-colors gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm text-zinc-900">Rounded Corners</span>
            <span className="text-xs text-zinc-500">Apply a border radius to images and videos</span>
          </div>
          <div className="flex items-center gap-4">
            {config.imageEffects?.roundedCorners?.enabled && (
              <div className="flex items-center gap-3 bg-zinc-50 py-1.5 px-3 rounded border border-zinc-100">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-8">RAD</span>
                <Slider 
                  value={[config.imageEffects.roundedCorners.radius]}
                  min={2}
                  max={64}
                  step={1}
                  onValueChange={(v) => updateConfig(c => {
                    if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
                    if (!c.imageEffects.roundedCorners) c.imageEffects.roundedCorners = { ...DEFAULT_IMAGE_EFFECTS.roundedCorners };
                    c.imageEffects.roundedCorners.radius = Array.isArray(v) ? v[0] : v;
                  })}
                  className="w-24"
                />
                <span className="text-xs font-medium text-zinc-600 w-6 text-right">
                  {config.imageEffects.roundedCorners.radius}px
                </span>
              </div>
            )}
            <Switch 
              checked={config.imageEffects?.roundedCorners?.enabled || false} 
              onCheckedChange={(checked) => updateConfig(c => { 
                if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
                if (!c.imageEffects.roundedCorners) c.imageEffects.roundedCorners = { ...DEFAULT_IMAGE_EFFECTS.roundedCorners };
                c.imageEffects.roundedCorners.enabled = checked;
              })}
            />
          </div>
        </div>

        {/* 4. Image Blend Mode Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-zinc-200 rounded-lg bg-white gap-4 shadow-sm hover:border-zinc-300 transition-colors">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm text-zinc-900">Image Blend Mode</span>
            <span className="text-xs text-zinc-500">Blend images with background elements</span>
          </div>
          <Select 
            value={config.imageEffects?.blendMode || 'normal'} 
            onValueChange={(v) => updateConfig(c => { 
              if (!c.imageEffects) c.imageEffects = { ...DEFAULT_IMAGE_EFFECTS };
              c.imageEffects.blendMode = v || 'normal';
            })}
          >
            <SelectTrigger className="w-[180px] h-9 border-zinc-200 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'].map(mode => (
                <SelectItem key={mode} value={mode} className="text-xs font-medium">
                  {mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image Click Action Section */}
      <div className="space-y-6 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4">Image Click Action</h3>
          <p className="text-xs text-zinc-500 mb-4">Determine what happens when a visitor clicks an image on the canvas stage.</p>
        </div>

        <RadioGroup 
          value={config.imageClick?.lightbox?.enabled ? "lightbox" : (config.imageClick?.canvasExpand?.enabled ? "canvasExpand" : "none")}
          onValueChange={(v) => updateConfig(c => { 
            if (!c.imageClick) c.imageClick = { ...DEFAULT_IMAGE_CLICK, lightbox: { ...DEFAULT_LIGHTBOX }, canvasExpand: { ...DEFAULT_CANVAS_EXPAND } };
            if (!c.imageClick.lightbox) c.imageClick.lightbox = { ...DEFAULT_LIGHTBOX };
            if (!c.imageClick.canvasExpand) c.imageClick.canvasExpand = { ...DEFAULT_CANVAS_EXPAND };
            c.imageClick.lightbox.enabled = v === "lightbox";
            c.imageClick.canvasExpand.enabled = v === "canvasExpand";
            c.imageClick.mode = v || 'none';
          })}
          className="flex flex-col gap-3"
        >
          {[
            { value: 'none', id: 'layout-click-none', label: 'None', desc: 'Clicking an image performs no action' },
            { value: 'lightbox', id: 'layout-click-light', label: 'Lightbox', desc: 'Open full-screen interactive image slider' },
            { value: 'canvasExpand', id: 'layout-click-exp', label: 'Canvas Expand', desc: 'Expand image to fill the screen canvas' }
          ].map(opt => {
            const currentVal = config.imageClick?.lightbox?.enabled ? "lightbox" : (config.imageClick?.canvasExpand?.enabled ? "canvasExpand" : "none");
            const active = currentVal === opt.value;
            return (
              <div 
                key={opt.value}
                className={`border rounded-lg transition-all bg-white overflow-hidden ${active ? 'border-zinc-900 shadow-sm ring-1 ring-zinc-900/5' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
              >
                <label 
                  htmlFor={opt.id}
                  className="p-3.5 cursor-pointer flex items-start gap-3 w-full"
                >
                  <RadioGroupItem value={opt.value} id={opt.id} className="mt-1" />
                  <div className="flex-1 select-none">
                    <span className="font-semibold text-sm text-zinc-900 block">{opt.label}</span>
                    <span className="text-xs text-zinc-500 mt-1 block leading-relaxed">{opt.desc}</span>
                  </div>
                </label>
                
                {active && opt.value === 'lightbox' && (
                  <div className="px-3.5 pb-4 pt-3 border-t border-zinc-100 bg-zinc-50/50">
                    <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-3">Lightbox Backdrop Settings</h4>
                    <div className="space-y-4">
                      <CompactColorPicker 
                        label="Overlay Color"
                        desc="Background color behind the active media item"
                        value={config.imageClick.lightbox.overlayColor || '#000000'}
                        onChange={(val) => updateConfig(c => {
                          if (!c.imageClick) c.imageClick = { lightbox: { enabled: true, backdropEffect: 'darken' }, canvasExpand: { enabled: false } };
                          if (!c.imageClick.lightbox) c.imageClick.lightbox = { enabled: true, backdropEffect: 'darken' };
                          c.imageClick.lightbox.overlayColor = val;
                        })}
                      />

                      <div className="space-y-2 p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-zinc-900">Overlay Opacity</span>
                          <span className="text-xs font-bold text-zinc-600">
                            {Math.round((config.imageClick.lightbox.overlayOpacity ?? 0.75) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">Control the transparency of the backdrop overlay</p>
                        <Slider 
                          min={0}
                          max={1}
                          step={0.01}
                          value={[config.imageClick.lightbox.overlayOpacity ?? 0.75]}
                          onValueChange={(val) => updateConfig(c => {
                            if (!c.imageClick) c.imageClick = { lightbox: { enabled: true, backdropEffect: 'darken' }, canvasExpand: { enabled: false } };
                            if (!c.imageClick.lightbox) c.imageClick.lightbox = { enabled: true, backdropEffect: 'darken' };
                            const v = Array.isArray(val) ? val[0] : val;
                            c.imageClick.lightbox.overlayOpacity = typeof v === 'number' ? v : 0.75;
                          })}
                          className="py-2"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3.5 border border-zinc-200 rounded-lg bg-white gap-4 shadow-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs text-zinc-900">Overlay Blend Mode</span>
                          <span className="text-[10px] text-zinc-400 leading-normal">Blend the backdrop overlay with background elements</span>
                        </div>
                        <Select 
                          value={config.imageClick.lightbox.overlayBlendMode || 'normal'} 
                          onValueChange={(v) => updateConfig(c => { 
                            if (!c.imageClick) c.imageClick = { lightbox: { enabled: true, backdropEffect: 'darken' }, canvasExpand: { enabled: false } };
                            if (!c.imageClick.lightbox) c.imageClick.lightbox = { enabled: true, backdropEffect: 'darken' };
                            c.imageClick.lightbox.overlayBlendMode = v || 'normal';
                          })}
                        >
                          <SelectTrigger className="w-[150px] h-8 border-zinc-200 text-xs font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'].map(mode => (
                              <SelectItem key={mode} value={mode} className="text-xs font-medium">
                                {mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
}
