import { useConfigStore } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const MOBILE_MODES = [
  {
    id: 'canvas',
    label: 'Canvas (Drag)',
    desc: 'Pan and pinch-zoom the scatter canvas. Touch inertia enabled.',
  },
  {
    id: 'slideshow',
    label: 'Slideshow (Scroll)',
    desc: 'Vertical scroll feed with scroll-snap and fade-in.',
  },
  {
    id: 'masonry',
    label: 'Masonry Grid',
    desc: 'Two-column image grid that scrolls natively.',
  },
] as const;

type MobileMode = (typeof MOBILE_MODES)[number]['id'];

const ORDER: MobileMode[] = ['canvas', 'slideshow', 'masonry'];

export function MobileForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  const availableModes: MobileMode[] =
    (config.mobile?.availableModes as MobileMode[]) ?? ['canvas', 'slideshow'];
  const defaultMode: MobileMode =
    (config.mobile?.defaultMode as MobileMode) ?? 'canvas';

  const toggleMode = (mode: MobileMode, enabled: boolean) => {
    updateConfig(c => {
      let modes = [...((c.mobile?.availableModes as MobileMode[]) ?? ['canvas', 'slideshow'])];
      if (enabled) {
        if (!modes.includes(mode)) modes.push(mode);
      } else {
        modes = modes.filter(m => m !== mode);
        // If default is being disabled, fall back to first remaining mode
        if (c.mobile.defaultMode === mode) {
          c.mobile.defaultMode = ORDER.find(m => modes.includes(m)) ?? modes[0] ?? 'canvas';
        }
      }
      c.mobile.availableModes = ORDER.filter(m => modes.includes(m));
    });
  };

  const setDefault = (mode: MobileMode) => {
    updateConfig(c => {
      // Enabling a mode as default also enables it
      const modes = [...((c.mobile?.availableModes as MobileMode[]) ?? ['canvas'])];
      if (!modes.includes(mode)) modes.push(mode);
      c.mobile.availableModes = ORDER.filter(m => modes.includes(m));
      c.mobile.defaultMode = mode;
    });
  };

  const atLeastOneEnabled = availableModes.length > 0;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Mobile</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Choose which view modes are available on mobile and which one loads by default.
          The mode-switcher button cycles through enabled modes in order.
        </p>
      </div>

      <div className="space-y-3">
        {MOBILE_MODES.map(mode => {
          const isEnabled = availableModes.includes(mode.id);
          const isDefault = defaultMode === mode.id;

          return (
            <div
              key={mode.id}
              className={`p-4 border rounded-lg transition-all shadow-sm ${
                isEnabled
                  ? 'border-zinc-200 bg-white hover:border-zinc-300'
                  : 'border-zinc-100 bg-zinc-50/50'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Default radio */}
                <button
                  type="button"
                  disabled={!isEnabled}
                  onClick={() => setDefault(mode.id)}
                  title="Set as default"
                  className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                    isDefault
                      ? 'border-zinc-900 bg-zinc-900'
                      : isEnabled
                      ? 'border-zinc-300 hover:border-zinc-500'
                      : 'border-zinc-200 cursor-not-allowed'
                  }`}
                />

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isEnabled ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {mode.label}
                    </span>
                    {isDefault && isEnabled && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <span className={`text-xs leading-relaxed ${isEnabled ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {mode.desc}
                  </span>
                </div>

                {/* Enable toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <Label className={`text-xs font-medium ${isEnabled ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {isEnabled ? 'On' : 'Off'}
                  </Label>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(v) => toggleMode(mode.id, v)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!atLeastOneEnabled && (
        <p className="text-xs text-red-500">
          At least one mode must be enabled.
        </p>
      )}

      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-500 leading-relaxed space-y-1">
        <p className="font-semibold text-zinc-700">Not configurable per-mobile</p>
        <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
          <li>Module zone positions — always top nav on mobile</li>
          <li>Layout modes (Random, Rows, Stacks, Infinite) — desktop only</li>
          <li>Zoom controls — hidden on mobile</li>
          <li>Lightbox — disabled on mobile in all modes</li>
        </ul>
      </div>
    </div>
  );
}
