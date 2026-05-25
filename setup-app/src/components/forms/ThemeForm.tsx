import { useConfigStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';

export function ThemeForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Theme & Styling</h2>
        <p className="text-sm text-zinc-500 mb-6">Configure the visual appearance of the portfolio.</p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Colours</h3>
        
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="bgColor" className="flex flex-col gap-1">
              <span>Background Colour</span>
              <span className="font-normal text-zinc-500">The main canvas background colour</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input 
                id="bgColor" 
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={config.theme.backgroundColor}
                onChange={(e) => updateConfig(c => { c.theme.backgroundColor = e.target.value })}
              />
              <Input 
                className="w-24 font-mono text-xs uppercase"
                value={config.theme.backgroundColor}
                onChange={(e) => updateConfig(c => { c.theme.backgroundColor = e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="textColor" className="flex flex-col gap-1">
              <span>Text Colour</span>
              <span className="font-normal text-zinc-500">The colour of typography and interface elements</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input 
                id="textColor" 
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={config.theme.textColor}
                onChange={(e) => updateConfig(c => { c.theme.textColor = e.target.value })}
              />
              <Input 
                className="w-24 font-mono text-xs uppercase"
                value={config.theme.textColor}
                onChange={(e) => updateConfig(c => { c.theme.textColor = e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="blendMode" className="flex flex-col gap-1">
              <span>Mix-Blend-Mode</span>
              <span className="font-normal text-zinc-500">Invert text colour over images</span>
            </Label>
            <Switch 
              id="blendMode" 
              checked={config.theme.blendMode}
              onCheckedChange={(v) => updateConfig(c => { c.theme.blendMode = v })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Background Effect</h3>
        
        <RadioGroup 
          value={config.theme.backgroundEffect} 
          onValueChange={(v) => updateConfig(c => { c.theme.backgroundEffect = v })}
          className="grid gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="solid" id="r-solid" />
            <Label htmlFor="r-solid" className="font-normal">Solid colour <span className="text-zinc-500 ml-1">— Simple flat colour</span></Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="gradient-static" id="r-grad-stat" />
            <Label htmlFor="r-grad-stat" className="font-normal">Gradient (static) <span className="text-zinc-500 ml-1">— Two-colour linear gradient</span></Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="gradient-animated" id="r-grad-anim" />
            <Label htmlFor="r-grad-anim" className="font-normal">Gradient (animated) <span className="text-zinc-500 ml-1">— Slow-panning gradient</span></Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="blob-mesh" id="r-blob" />
            <Label htmlFor="r-blob" className="font-normal">Blob Mesh <span className="text-zinc-500 ml-1">— Floating colour blobs</span></Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="noise" id="r-noise" />
            <Label htmlFor="r-noise" className="font-normal">Noise only <span className="text-zinc-500 ml-1">— Solid + texture grain</span></Label>
          </div>
        </RadioGroup>

        {(config.theme.backgroundEffect.includes('gradient') || config.theme.backgroundEffect === 'blob-mesh') && (
          <div className="grid gap-4 pl-6 pt-2 border-l-2 border-zinc-100">
            <div className="flex items-center justify-between">
              <Label htmlFor="gradFrom">Gradient From</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  id="gradFrom" type="color" className="w-12 h-10 p-1"
                  value={config.theme.backgroundGradientFrom}
                  onChange={(e) => updateConfig(c => { c.theme.backgroundGradientFrom = e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="gradTo">Gradient To</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  id="gradTo" type="color" className="w-12 h-10 p-1"
                  value={config.theme.backgroundGradientTo}
                  onChange={(e) => updateConfig(c => { c.theme.backgroundGradientTo = e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-4">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Noise / Grain</h3>
        
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="noiseEnabled">Enable noise overlay</Label>
            <Switch 
              id="noiseEnabled" 
              checked={config.theme.noiseGrain.enabled}
              onCheckedChange={(v) => updateConfig(c => { c.theme.noiseGrain.enabled = v })}
            />
          </div>

          {config.theme.noiseGrain.enabled && (
            <div className="pl-6 pt-2 border-l-2 border-zinc-100">
              <Label className="mb-4 block">Opacity</Label>
              <div className="flex items-center gap-4">
                <Slider 
                  className="flex-1"
                  min={0.01} max={0.2} step={0.01}
                  value={[config.theme.noiseGrain.opacity]}
                  onValueChange={(vals) => updateConfig(c => { c.theme.noiseGrain.opacity = vals[0] })}
                />
                <span className="w-12 text-sm font-mono">{config.theme.noiseGrain.opacity}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
