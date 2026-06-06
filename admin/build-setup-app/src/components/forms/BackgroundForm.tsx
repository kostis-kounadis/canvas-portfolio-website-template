import { useConfigStore } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';

interface ColorPickerProps {
  label: string;
  desc: string;
  value: string;
  onChange: (val: string) => void;
  presets: string[];
}

function ColorPicker({ label, desc, value, onChange, presets }: ColorPickerProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors bg-white gap-4 shadow-sm">
      <div className="flex flex-col gap-0.5 flex-1">
        <span className="font-medium text-sm text-zinc-900">{label}</span>
        <span className="text-xs text-zinc-500 leading-relaxed">{desc}</span>
      </div>
      
      <div className="flex items-center gap-3 self-end sm:self-auto">
        {/* Curated Palette Presets */}
        <div className="flex items-center gap-1.5 mr-2">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              className={`h-5 w-5 rounded-full border transition-all ${value.toLowerCase() === p.toLowerCase() ? 'border-zinc-900 scale-110 shadow-sm ring-1 ring-zinc-900/10' : 'border-zinc-200 hover:scale-105'}`}
              style={{ backgroundColor: p }}
              title={p}
              onClick={() => onChange(p)}
            />
          ))}
        </div>

        {/* Input + Native Picker backup */}
        <div className="flex items-center gap-2 border border-zinc-200 rounded-md p-1 bg-zinc-50 hover:bg-zinc-100/50 hover:border-zinc-300 transition-all">
          <input 
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded border border-zinc-200 cursor-pointer p-0 bg-transparent"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 font-mono text-xs uppercase bg-transparent border-none outline-none focus:ring-0 p-0 text-center text-zinc-700 font-semibold"
          />
        </div>
      </div>
    </div>
  );
}

export function BackgroundForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  const bgPresets = ['#f7f5f0', '#ffffff', '#FAF9F6', '#111111', '#000000'];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Background</h2>
        <p className="text-sm text-zinc-500 mb-6">Configure the background colors, gradients, and textures.</p>
      </div>

      {/* Background Section */}
      <div className="space-y-4 pt-2">
        <RadioGroup 
          value={config.theme.backgroundEffect} 
          onValueChange={(v) => updateConfig(c => { c.theme.backgroundEffect = v })}
          className="flex flex-col gap-3"
        >
          {[
            { value: 'solid', id: 'r-solid', label: 'Solid Color', desc: 'A clean, simple flat canvas background' },
            { value: 'gradient-static', id: 'r-grad-stat', label: 'Static Gradient', desc: 'A beautiful linear blend between two colors' },
            { value: 'gradient-animated', id: 'r-grad-anim', label: 'Animated Gradient', desc: 'Slow-panning, fluid color gradients' }
          ].map(opt => {
            const active = config.theme.backgroundEffect === opt.value;
            return (
              <div key={opt.value} className={`border rounded-lg transition-all ${active ? 'border-zinc-900 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'} bg-white`}>
                <label 
                  htmlFor={opt.id}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer ${active ? 'rounded-t-lg' : 'rounded-lg hover:bg-zinc-50'}`}
                >
                  <RadioGroupItem value={opt.value} id={opt.id} className="mt-0.5" />
                  <div className="flex-1 select-none">
                    <span className="font-medium text-sm text-zinc-900 block">{opt.label}</span>
                    <span className="text-xs text-zinc-500 mt-1 block leading-relaxed">{opt.desc}</span>
                  </div>
                </label>
                
                {active && opt.value === 'solid' && (
                  <div className="bg-zinc-50/80 p-4 border-t border-zinc-100 rounded-b-lg">
                    <ColorPicker 
                      label="Background Colour"
                      desc="The main canvas background colour"
                      value={config.theme.backgroundColor}
                      onChange={(val) => updateConfig(c => { c.theme.backgroundColor = val })}
                      presets={bgPresets}
                    />
                  </div>
                )}
                
                {active && opt.value.includes('gradient') && (
                  <div className="bg-zinc-50/80 p-4 border-t border-zinc-100 rounded-b-lg space-y-4">
                    <ColorPicker 
                      label="Gradient From"
                      desc="Starting color of background gradient"
                      value={config.theme.backgroundGradientFrom}
                      onChange={(val) => updateConfig(c => { c.theme.backgroundGradientFrom = val })}
                      presets={bgPresets}
                    />
                    <ColorPicker 
                      label="Gradient To"
                      desc="Ending color of background gradient"
                      value={config.theme.backgroundGradientTo}
                      onChange={(val) => updateConfig(c => { c.theme.backgroundGradientTo = val })}
                      presets={bgPresets}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </RadioGroup>
        <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="noiseEnabled" className="font-medium text-sm text-zinc-900 cursor-pointer">Enable noise overlay</Label>
              <span className="text-xs text-zinc-500">Inject subtle texture grain overlay onto the portfolio canvas</span>
            </div>
            <Switch 
              id="noiseEnabled" 
              checked={config.theme.noiseGrain.enabled}
              onCheckedChange={(v) => updateConfig(c => { c.theme.noiseGrain.enabled = v })}
            />
          </div>

          {config.theme.noiseGrain.enabled && (
            <div className="pt-4 mt-4 border-t border-zinc-200/60 space-y-6">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Noise / Grain Settings</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700">Opacity Level</span>
                  <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold">{config.theme.noiseGrain.opacity ?? 0.04}</span>
                </div>
                <p className="text-[11px] text-zinc-500">Controls the transparency of the grain effect</p>
                <div className="flex items-center gap-4">
                  <Slider 
                    className="flex-1"
                    min={0.01} max={0.5} step={0.01}
                    value={[config.theme.noiseGrain.opacity ?? 0.04]}
                    onValueChange={(val: number | readonly number[]) => {
                      const num = Array.isArray(val) ? val[0] : (val as number);
                      updateConfig(c => { c.theme.noiseGrain.opacity = num; });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-700">Grain Size (Frequency)</span>
                  <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold">{config.theme.noiseGrain.size ?? 0.65}</span>
                </div>
                <p className="text-[11px] text-zinc-500">Controls the frequency of the noise texture (lower value = larger grain)</p>
                <div className="flex items-center gap-4">
                  <Slider 
                    className="flex-1"
                    min={0.01} max={2} step={0.01}
                    value={[config.theme.noiseGrain.size ?? 0.65]}
                    onValueChange={(val: number | readonly number[]) => {
                      const num = Array.isArray(val) ? val[0] : (val as number);
                      updateConfig(c => { c.theme.noiseGrain.size = num; });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
