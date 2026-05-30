const fs = require('fs');
const path = require('path');

const formsPath = path.resolve(__dirname, 'setup-app', 'src', 'components', 'Forms.tsx');
let content = fs.readFileSync(formsPath, 'utf8');

const targetStr = `{/* Module-specific options conditionally rendered */}`;
const injection = `{/* Module-specific options conditionally rendered */}
              {mod.visible && modKey === 'title' && (
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
                    </div>
                  )}
                </div>
              )}`;

content = content.replace(targetStr, injection);
fs.writeFileSync(formsPath, content, 'utf8');

console.log('UI injected into Forms.tsx');
