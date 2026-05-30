const fs = require('fs');
const path = require('path');

const formsPath = path.resolve(__dirname, 'setup-app', 'src', 'components', 'Forms.tsx');
let content = fs.readFileSync(formsPath, 'utf8');

if (!content.includes('AccordionContent')) {
  const importTarget = `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';`;
  const importReplacement = `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\nimport { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';`;
  content = content.replace(importTarget, importReplacement);
}

// 1. Wrap in Accordion
content = content.replace(
  `{/* Modules List */}
      <div className="space-y-4">
        {['title', 'email', 'info', 'categories', 'layouts'].map((modKey) => {`,
  `{/* Modules List */}
      <Accordion type="multiple" className="space-y-4">
        {['title', 'email', 'info', 'categories', 'layouts'].map((modKey) => {`
);

// 2. Change outer div to AccordionItem
content = content.replace(
  `            <div key={modKey} className="flex flex-col gap-4 p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors bg-white">`,
  `            <AccordionItem key={modKey} value={modKey} className="flex flex-col border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors bg-white overflow-hidden shadow-sm data-[state=open]:border-zinc-300 border-b-0">`
);

// 3. Change header div to AccordionTrigger
content = content.replace(
  `              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">`,
  `              <AccordionTrigger className="px-4 py-4 hover:no-underline flex items-center justify-between w-full">
                <div className="flex flex-col gap-0.5 text-left">`
);

// 4. Add stopPropagation to controls so clicking them doesn't toggle accordion
content = content.replace(
  `                <div className="flex items-center gap-4">
                  <Select`,
  `                <div 
                  className="flex items-center gap-4" 
                  onClick={(e) => e.stopPropagation()} 
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Select`
);

// 5. Close AccordionTrigger and open AccordionContent before the conditional modules
content = content.replace(
  `              {/* Module-specific options conditionally rendered */}
              {mod.visible && modKey === 'title' && (
                <div className="pt-4 border-t border-zinc-100 space-y-6">`,
  `              </AccordionTrigger>

              {/* Module-specific options inside AccordionContent */}
              <AccordionContent className={!mod.visible ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                <div className="px-4 pb-4 flex flex-col gap-4">
              
              {modKey === 'title' && (
                <div className="pt-4 border-t border-zinc-100 space-y-6">`
);

// 6. Update all `{mod.visible && modKey === 'X'` to just `{modKey === 'X'`
content = content.replace(/\{mod\.visible && modKey === 'info' && \(/g, `{modKey === 'info' && (`);
content = content.replace(/\{mod\.visible && \(modKey === 'categories' \|\| modKey === 'layouts'\) && \(\(\) => \{/g, `{(modKey === 'categories' || modKey === 'layouts') && (() => {`);

// 7. Add closing tags for AccordionContent and AccordionItem
// This appears right before the end of the map function:
//                }
//              })()}
//            </div>
//          );
//        })}
//      </div>
//    </div>
//  );

content = content.replace(
  `              })()}
            </div>
          );
        })}
      </div>`,
  `              })()}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>`
);

fs.writeFileSync(formsPath, content, 'utf8');
console.log("Accordion injection complete.");
