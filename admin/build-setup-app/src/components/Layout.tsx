import * as React from "react"
import { AppSidebar } from "./AppSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useConfigStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Save, Wrench, ExternalLink } from "lucide-react"

const IS_DEMO = import.meta.env.VITE_DEMO_MODE;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { activeSection, saveConfig, buildSite, isSaving, isBuilding, isDirty } = useConfigStore()

  const getSectionTitle = (id: string) => {
    switch(id) {
      case 'identity': return 'Identity';
      case 'theme': return 'Theme & Styling';
      case 'layouts': return 'Layouts';
      case 'images': return 'Image Settings';
      case 'modules': return 'Modules';
      case 'seo': return 'SEO';
      case 'favicon': return 'Favicon & Assets';
      case 'deployment': return 'Deployment';
      case 'help': return 'Help & Guide';
      default: return 'Settings';
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex flex-col h-screen w-full bg-white font-sans text-sm tracking-[-0.02em] text-zinc-900">
          {IS_DEMO && (
            <div className="flex items-center justify-center gap-2 bg-zinc-900 text-zinc-300 text-[11px] font-medium py-1.5 px-4 shrink-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              Demo mode — changes are ephemeral and not saved to disk. Reload to reset.
            </div>
          )}
          <div className="flex flex-1 min-h-0">
          <AppSidebar />
          
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header with Breadcrumbs */}
            <header className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4 justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50" />
                <Separator orientation="vertical" className="h-4 bg-zinc-200" />
                
                <span className="font-medium text-sm text-zinc-900 tracking-[-0.02em]">
                  {getSectionTitle(activeSection)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Auto-save status — hidden in demo mode */}
                {!IS_DEMO && (isSaving || isDirty) && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 select-none mr-2 font-medium">
                    <div className={`h-1.5 w-1.5 rounded-full ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-zinc-300'}`} />
                    <span>
                      {isSaving ? 'Auto-saving to disk...' : 'Unsaved draft...'}
                    </span>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs font-semibold border-zinc-200 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 transition-colors"
                  onClick={() => window.open(import.meta.env.BASE_URL.replace(/\/admin\/$/, '/'), '_blank')}
                  title="Open the live portfolio website in a new tab"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5 stroke-[2px]" />
                  View Site
                </Button>

                {/* Save Config — hidden in demo mode */}
                {!IS_DEMO && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-8 text-xs font-semibold border-zinc-200 hover:bg-zinc-50 transition-all ${isDirty ? 'border-zinc-900 text-zinc-900 bg-zinc-50' : 'text-zinc-500'}`}
                    disabled={isSaving || !isDirty}
                    onClick={() => saveConfig()}
                    title="Manually force save configuration to config.json on disk immediately"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5 stroke-[2px]" />
                    {isSaving ? 'Saving...' : 'Save Config'}
                  </Button>
                )}

                {/* Rebuild Site — hidden in demo mode */}
                {!IS_DEMO && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm"
                    disabled={isBuilding}
                    onClick={async () => {
                      if (isDirty) await saveConfig();
                      await buildSite();
                    }}
                    title="Compile Static Site: scans your assets/images/ folder for new media, analyzes aspect ratios, and generates sitemap/index.html metadata"
                  >
                    <Wrench className="mr-1.5 h-3.5 w-3.5 stroke-[2px]" />
                    {isBuilding ? 'Building...' : 'Rebuild Site'}
                  </Button>
                )}
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-6 bg-white">
              <div className="mx-auto max-w-4xl space-y-6">
                {children}
              </div>
            </main>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
