export { IdentityForm } from './forms/IdentityForm';
export { ThemeForm } from './forms/ThemeForm';
import { useConfigStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function LayoutsForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Layouts</h2>
        <p className="text-sm text-zinc-500 mb-6">Configure the default layout and settings.</p>
      </div>
      
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Default Layout</Label>
          <Select 
            value={config.layouts.default} 
            onValueChange={(v) => updateConfig(c => { c.layouts.default = v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random (Scattered)</SelectItem>
              <SelectItem value="rows">Rows (Masonry)</SelectItem>
              <SelectItem value="stacks">Stacks (Depth)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

const ZONES = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'middle-left', label: 'Middle Left' },
  { value: 'middle-right', label: 'Middle Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' }
];

export function ModulesForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Modules</h2>
        <p className="text-sm text-zinc-500 mb-6">Position and configure UI modules.</p>
      </div>

      <div className="space-y-6">
        {['title', 'email', 'info', 'categories', 'layouts'].map((modKey) => {
          const mod = config.ui.modules[modKey as keyof typeof config.ui.modules];
          return (
            <div key={modKey} className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg">
              <div className="flex flex-col gap-1">
                <span className="font-medium capitalize">{modKey}</span>
              </div>
              <div className="flex items-center gap-4">
                <Select 
                  value={mod.position} 
                  onValueChange={(v) => updateConfig(c => { c.ui.modules[modKey as keyof typeof config.ui.modules].position = v })}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONES.map(z => <SelectItem key={z.value} value={z.value} className="text-xs">{z.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Switch 
                  checked={mod.visible}
                  onCheckedChange={(v) => updateConfig(c => { c.ui.modules[modKey as keyof typeof config.ui.modules].visible = v })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InteractionsForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Interactions & Image Effects</h2>
        <p className="text-sm text-zinc-500 mb-6">How images respond to hover and click.</p>
      </div>
      
      <div className="grid gap-6 border-b border-zinc-200 pb-6">
        <h3 className="text-sm font-semibold text-zinc-900">Hover Reveal</h3>
        <div className="flex items-center justify-between">
          <Label className="flex flex-col gap-1">
            <span>Hover Reveal</span>
            <span className="font-normal text-zinc-500">Restore full colour on hover</span>
          </Label>
          <Switch 
            checked={config.imageEffects.hoverReveal}
            onCheckedChange={(v) => updateConfig(c => { c.imageEffects.hoverReveal = v })}
          />
        </div>
      </div>

      <div className="grid gap-6">
        <h3 className="text-sm font-semibold text-zinc-900">Image Click Action</h3>
        <RadioGroup 
          value={config.imageClick.lightbox.enabled ? "lightbox" : (config.imageClick.canvasExpand.enabled ? "canvasExpand" : "none")}
          onValueChange={(v) => updateConfig(c => { 
            c.imageClick.lightbox.enabled = v === "lightbox";
            c.imageClick.canvasExpand.enabled = v === "canvasExpand";
          })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="c-none" />
            <Label htmlFor="c-none">None</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lightbox" id="c-light" />
            <Label htmlFor="c-light">Lightbox</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="canvasExpand" id="c-exp" />
            <Label htmlFor="c-exp">Canvas Expand</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

export function SEOForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">SEO & Metadata</h2>
        <p className="text-sm text-zinc-500 mb-6">Search engine and social media sharing info.</p>
      </div>
      
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Meta Description</Label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm"
            value={config.seo.metaDescription}
            onChange={(e) => updateConfig(c => { c.seo.metaDescription = e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Keywords (comma separated)</Label>
          <Input 
            value={config.seo.keywords.join(', ')}
            onChange={(e) => updateConfig(c => { c.seo.keywords = e.target.value.split(',').map(s=>s.trim()) })}
          />
        </div>
      </div>
    </div>
  );
}

export function DeploymentForm() {
  const { buildSite, isBuilding } = useConfigStore();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Deployment</h2>
        <p className="text-sm text-zinc-500 mb-6">Build the static files for production.</p>
      </div>
      
      <div className="p-6 border border-zinc-200 rounded-lg bg-zinc-50 space-y-4">
        <h3 className="font-medium">Generate Production Build</h3>
        <p className="text-sm text-zinc-600">
          This runs the node script to generate the <code>data.js</code> file from your <code>assets/images</code> folder, and updates all static HTML meta tags.
        </p>
        <Button onClick={() => buildSite()} disabled={isBuilding}>
          {isBuilding ? 'Building...' : 'Rebuild Now'}
        </Button>
      </div>
    </div>
  );
}

