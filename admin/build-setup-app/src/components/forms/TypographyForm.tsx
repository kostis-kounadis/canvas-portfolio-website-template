import { useConfigStore } from '@/lib/store';
import { Label } from '@/components/ui/label';
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

export function TypographyForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  const textPresets = ['#111111', '#000000', '#ffff00', '#00ff00', '#0066ff'];

  // Defensive fallback for cached older config structures
  const typo = config.typography || {
    fontMode: 'google',
    fontWeight: 400,
    fontWidth: 100,
    googleEmbedCode: '',
    localFontUrl: '',
    baseSize: '18px',
    textColor: '#0066ff',
    blendMode: false,
    textAnimation: 'none'
  } as any;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Typography</h2>
        <p className="text-sm text-zinc-500 mb-6">Configure the fonts, sizes, and colors for text elements.</p>
      </div>

      {/* Typography Section */}
      <div className="space-y-6">
        
        {/* Font Source & Setup */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-zinc-900 block mb-2">Font Source</Label>
          <RadioGroup 
            value={typo.fontMode || 'google'} 
            onValueChange={(v) => updateConfig(c => { 
              if (!c.typography) c.typography = { ...typo };
              c.typography.fontMode = v; 
            })}
            className="flex flex-col gap-3"
          >
            {[
              { value: 'archivo', id: 'f-archivo', label: 'Archivo', desc: 'Grotesque sans-serif with variable width & weight' },
              { value: 'jost', id: 'f-jost', label: 'Jost', desc: 'Futura-inspired sans-serif' },
              { value: 'space-grotesk', id: 'f-space', label: 'Space Grotesk', desc: 'Quirky geometric sans-serif' },
              { value: 'eb-garamond', id: 'f-garamond', label: 'EB Garamond', desc: 'Classic, elegant serif' },
              { value: 'fraunces', id: 'f-fraunces', label: 'Fraunces', desc: 'Old style serif with variable weight' },
              { value: 'syne-tactile', id: 'f-syne', label: 'Syne Tactile', desc: 'Expressive, textured script' },
              { value: 'monospace', id: 'f-monospace', label: 'JetBrains Mono', desc: 'Clean, legible monospace' },
              { value: 'google', id: 'f-google', label: 'Custom Google Font', desc: 'Load a font via Google Fonts embed code' },
              { value: 'local', id: 'f-local', label: 'Local Font File', desc: 'Host your own .woff2 or .ttf font file' }
            ].map(opt => {
              const active = (typo.fontMode || 'google') === opt.value;
              
              let hasWeight = true;
              let hasWidth = false;
              let weightMin = 100, weightMax = 900;
              let widthMin = 50, widthMax = 200;

              if (opt.value === 'syne-tactile') hasWeight = false;
              if (opt.value === 'eb-garamond') { weightMin = 400; weightMax = 800; }
              if (opt.value === 'space-grotesk') { weightMin = 300; weightMax = 700; }
              if (opt.value === 'monospace') { weightMin = 100; weightMax = 800; }
              
              if (opt.value === 'archivo') { hasWidth = true; widthMin = 62; widthMax = 125; }
              if (opt.value === 'google' || opt.value === 'local') { hasWidth = true; }

              const showOptions = opt.value === 'google' || opt.value === 'local' || hasWeight || hasWidth;

              return (
                <div key={opt.value} className={`border rounded-lg transition-all ${active ? 'border-zinc-900 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'} bg-white`}>
                  <label 
                    htmlFor={opt.id}
                    className={`flex items-start gap-3 p-3.5 cursor-pointer ${active ? (showOptions ? 'rounded-t-lg' : 'rounded-lg') : 'rounded-lg hover:bg-zinc-50'}`}
                  >
                    <RadioGroupItem value={opt.value} id={opt.id} className="mt-0.5" />
                    <div className="flex-1 select-none">
                      <span className="font-medium text-sm text-zinc-900 block">{opt.label}</span>
                      <span className="text-xs text-zinc-500 mt-1 block leading-relaxed">{opt.desc}</span>
                    </div>
                  </label>
                  
                  {active && showOptions && (
                    <div className="bg-zinc-50/80 p-4 border-t border-zinc-100 rounded-b-lg space-y-4">
                      {opt.value === 'google' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <Label className="text-xs font-semibold text-zinc-700">Embed Code</Label>
                            <a href="https://fonts.google.com" target="_blank" rel="noreferrer" className="text-[10px] font-medium text-blue-600 hover:underline">
                              Browse Google Fonts ↗
                            </a>
                          </div>
                          <textarea
                            value={typo.googleEmbedCode || ''}
                            onChange={(e) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.googleEmbedCode = e.target.value; 
                            })}
                            placeholder={'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'}
                            className="w-full h-24 p-3 text-xs font-mono bg-white border border-zinc-200 rounded-md focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all placeholder:text-zinc-300"
                          />
                          <p className="text-[11px] text-zinc-500 leading-tight">Paste the standard HTML embed code. The system will automatically extract and apply the font family globally.</p>
                        </div>
                      )}

                      {opt.value === 'local' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-zinc-700">Font File Path</Label>
                          <input
                            type="text"
                            value={typo.localFontUrl || ''}
                            onChange={(e) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.localFontUrl = e.target.value; 
                            })}
                            placeholder="./fonts/myfont.woff2"
                            className="w-full p-2.5 text-xs font-mono bg-white border border-zinc-200 rounded-md focus:border-zinc-400 outline-none"
                          />
                          <p className="text-[11px] text-zinc-500 leading-tight">Provide the path to your .woff2 or .ttf file relative to the root directory (e.g. <code className="bg-zinc-100 px-1 py-0.5 rounded">./fonts/Geist.woff2</code>).</p>
                        </div>
                      )}
                      
                      {/* Weight and Width Sliders */}
                      {hasWeight && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Font Weight</span>
                            <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold">{typo.fontWeight || 400}</span>
                          </div>
                          <Slider 
                            min={weightMin} max={weightMax} step={100}
                            value={[typo.fontWeight || 400]}
                            onValueChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.fontWeight = Array.isArray(val) ? val[0] : val; 
                            })}
                          />
                        </div>
                      )}
                      
                      {hasWidth && (
                        <div className="space-y-2 pt-2 border-t border-zinc-100">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-700">Font Width (Stretch) %</span>
                            <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold">{typo.fontWidth || 100}%</span>
                          </div>
                          <Slider 
                            min={widthMin} max={widthMax} step={1}
                            value={[typo.fontWidth || 100]}
                            onValueChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.fontWidth = Array.isArray(val) ? val[0] : val; 
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Font Size Slider */}
        <div className="space-y-3">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium text-zinc-900 block mb-1">Base Text Size</Label>
            <span className="text-xs text-zinc-500">Sets the baseline font size. All other text elements scale relatively.</span>
          </div>
          <div className="flex items-center gap-4 px-1">
            <Slider 
              className="flex-1"
              min={12} max={32} step={1}
              value={[parseInt(typo.baseSize || '18') || 18]}
              onValueChange={(val: number | readonly number[]) => {
                const num = Array.isArray(val) ? val[0] : (val as number);
                updateConfig(c => { 
                  if (!c.typography) c.typography = { ...typo };
                  c.typography.baseSize = `${num}px`; 
                });
              }}
            />
            <span className="text-zinc-900 font-mono bg-white border border-zinc-200 px-2 py-1 rounded font-bold text-sm shrink-0">{typo.baseSize || '18px'}</span>
          </div>
        </div>

        {/* Text Case Selector */}
        <div className="space-y-3">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm font-medium text-zinc-900 block mb-1">Base Text Case</Label>
            <span className="text-xs text-zinc-500">Choose the default capitalization style for your portfolio content.</span>
          </div>
          <RadioGroup 
            value={typo.textCase || 'uppercase'} 
            onValueChange={(v) => updateConfig(c => { 
              if (!c.typography) c.typography = { ...typo };
              c.typography.textCase = v; 
            })}
            className="flex flex-col gap-3 sm:flex-row"
          >
            {[
              { value: 'uppercase', label: 'UPPERCASE' },
              { value: 'lowercase', label: 'lowercase' },
              { value: 'capitalize', label: 'Capitalize' },
              { value: 'normal', label: 'Normal' }
            ].map(opt => (
              <label 
                key={opt.value}
                className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                  (typo.textCase || 'uppercase') === opt.value ? 'border-zinc-900 bg-zinc-50 shadow-sm' : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <RadioGroupItem value={opt.value} id={`tc-${opt.value}`} />
                <span className={`font-medium text-sm text-zinc-900`} style={{ textTransform: opt.value as any }}>{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Text Style & Animation */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-zinc-900 block mb-2">Text Style & Animation</Label>
          <RadioGroup 
            value={typo.textAnimation || 'none'} 
            onValueChange={(v) => updateConfig(c => { 
              if (!c.typography) c.typography = { ...typo };
              c.typography.textAnimation = v; 
            })}
            className="flex flex-col gap-3"
          >
            {[
              { value: 'none', id: 't-none', label: 'Single Color', desc: 'A solid, static text color' },
              { value: 'gradient', id: 't-grad', label: 'Gradient Pan', desc: 'Smoothly pans across a color gradient' },
              { value: 'color-cycle', id: 't-cycle', label: 'Color Cycle', desc: 'Cycles through distinct color stops' },
              { value: 'hue-rotate', id: 't-hue', label: 'Hue Rotate', desc: 'Rotates the hue across the color spectrum' }
            ].map(opt => {
              const active = (typo.textAnimation || 'none') === opt.value;
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
                  
                  {active && (
                    <div className="bg-zinc-50/80 p-4 border-t border-zinc-100 rounded-b-lg space-y-4">
                      {opt.value === 'none' && (
                        <ColorPicker 
                          label="Text Colour"
                          desc="The primary color of typography and interface elements"
                          value={typo.textColor || '#000000'}
                          onChange={(val) => updateConfig(c => { 
                            if (!c.typography) c.typography = { ...typo };
                            c.typography.textColor = val; 
                          })}
                          presets={textPresets}
                        />
                      )}

                      {opt.value === 'gradient' && (
                        <>
                          <ColorPicker 
                            label="Gradient Base Colour"
                            desc="The main color of the gradient"
                            value={typo.gradientColor1 || '#000000'}
                            onChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.gradientColor1 = val; 
                            })}
                            presets={textPresets}
                          />
                          <ColorPicker 
                            label="Gradient Edge Colour"
                            desc="The color that the text gradient pans towards"
                            value={typo.gradientColor2 || '#0066ff'}
                            onChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.gradientColor2 = val; 
                            })}
                            presets={textPresets}
                          />
                          <div className="space-y-3 px-1 pt-2">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-700">Animation Speed</span>
                              <span className="text-zinc-900 font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200">{typo.gradientSpeed || 5}s</span>
                            </div>
                            <Slider 
                              min={2} max={60} step={1}
                              value={[typo.gradientSpeed || 5]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { 
                                  if (!c.typography) c.typography = { ...typo };
                                  c.typography.gradientSpeed = num; 
                                });
                              }}
                            />
                            <p className="text-[11px] text-zinc-500">Duration of one complete animation cycle.</p>
                          </div>
                        </>
                      )}

                      {opt.value === 'color-cycle' && (
                        <>
                          <ColorPicker 
                            label="Base Colour"
                            desc="The starting color of the cycle"
                            value={typo.cycleColor1 || '#000000'}
                            onChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.cycleColor1 = val; 
                            })}
                            presets={textPresets}
                          />
                          <ColorPicker 
                            label="Cycle Colour 1"
                            desc="The second color in the cycle sequence"
                            value={typo.cycleColor2 || '#ffff00'}
                            onChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.cycleColor2 = val; 
                            })}
                            presets={textPresets}
                          />
                          <ColorPicker 
                            label="Cycle Colour 2"
                            desc="The third color in the cycle sequence"
                            value={typo.cycleColor3 || '#00ff00'}
                            onChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.cycleColor3 = val; 
                            })}
                            presets={textPresets}
                          />
                          <div className="space-y-3 px-1 pt-2">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-700">Animation Speed</span>
                              <span className="text-zinc-900 font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200">{typo.cycleSpeed || 8}s</span>
                            </div>
                            <Slider 
                              min={2} max={60} step={1}
                              value={[typo.cycleSpeed || 8]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { 
                                  if (!c.typography) c.typography = { ...typo };
                                  c.typography.cycleSpeed = num; 
                                });
                              }}
                            />
                            <p className="text-[11px] text-zinc-500">Duration of one complete animation cycle.</p>
                          </div>
                        </>
                      )}

                      {opt.value === 'hue-rotate' && (
                        <>
                          <ColorPicker 
                            label="Base Colour"
                            desc="The base color before hue rotation is applied"
                            value={typo.hueRotateBase || '#0066ff'}
                            onChange={(val) => updateConfig(c => { 
                              if (!c.typography) c.typography = { ...typo };
                              c.typography.hueRotateBase = val; 
                            })}
                            presets={textPresets}
                          />
                          <div className="space-y-3 px-1 pt-2">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-700">Animation Speed</span>
                              <span className="text-zinc-900 font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200">{typo.hueRotateSpeed || 6}s</span>
                            </div>
                            <Slider 
                              min={2} max={60} step={1}
                              value={[typo.hueRotateSpeed || 6]}
                              onValueChange={(val: number | readonly number[]) => {
                                const num = Array.isArray(val) ? val[0] : (val as number);
                                updateConfig(c => { 
                                  if (!c.typography) c.typography = { ...typo };
                                  c.typography.hueRotateSpeed = num; 
                                });
                              }}
                            />
                            <p className="text-[11px] text-zinc-500">Duration of one complete animation cycle.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Text Blend Mode */}
        <div className="space-y-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="blendMode" className="text-sm font-medium text-zinc-900 block mb-1 cursor-pointer">Text Blend Mode</Label>
            <span className="text-xs text-zinc-500">Apply a CSS mix-blend-mode to text elements to dynamically blend with the background.</span>
          </div>
          <select
            id="blendMode"
            className="w-full text-sm bg-white border border-zinc-200 rounded-md px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
            value={typo.blendMode === true ? 'difference' : (typo.blendMode === false || !typo.blendMode ? 'normal' : typo.blendMode)}
            onChange={(e) => updateConfig(c => {
              if (!c.typography) c.typography = { ...typo };
              c.typography.blendMode = e.target.value;
            })}
          >
            {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'].map(mode => (
              <option key={mode} value={mode}>{mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
