const fs = require('fs');
const path = require('path');

const formsPath = path.resolve(__dirname, 'setup-app', 'src', 'components', 'Forms.tsx');
let content = fs.readFileSync(formsPath, 'utf8');

const targetStr = `{/* Modules List */}
      <Accordion multiple className="space-y-4">`;

const globalSettingsBlock = `      {/* Global Settings */}
      <Accordion type="single" collapsible className="mb-8">
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

      {/* Modules List */}`;

if (!content.includes('Global Settings')) {
  content = content.replace(targetStr, globalSettingsBlock + '\n      <Accordion multiple className="space-y-4">');
  fs.writeFileSync(formsPath, content, 'utf8');
}
console.log("Global Settings UI injected");
