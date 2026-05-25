import * as React from "react"
import { AppSidebar } from "./AppSidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useConfigStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Save, Wrench } from "lucide-react"

export default function Layout({ children }: { children: React.ReactNode }) {
  const { activeSection, saveConfig, buildSite, isSaving, isBuilding, isDirty } = useConfigStore()

  const getSectionTitle = (id: string) => {
    switch(id) {
      case 'identity': return 'Identity';
      case 'theme': return 'Theme & Styling';
      case 'layouts': return 'Layouts';
      case 'modules': return 'Modules';
      case 'interactions': return 'Interactions';
      case 'seo': return 'SEO';
      case 'deployment': return 'Deployment';
      default: return 'Settings';
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white font-sans text-sm tracking-[-0.02em] text-zinc-900">
          <AppSidebar />
          
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header with Breadcrumbs */}
            <header className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4 justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50" />
                <Separator orientation="vertical" className="h-4 bg-zinc-200" />
                
                <Breadcrumb>
                  <BreadcrumbList className="text-sm tracking-[-0.02em]">
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#" className="text-zinc-500 hover:text-zinc-900">Configuration</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-zinc-300" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-medium text-zinc-900">{getSectionTitle(activeSection)}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs font-medium"
                  disabled={isSaving || !isDirty}
                  onClick={() => saveConfig()}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {isSaving ? 'Saving...' : 'Save Config'}
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800"
                  disabled={isBuilding}
                  onClick={() => buildSite()}
                >
                  <Wrench className="mr-1.5 h-3.5 w-3.5" />
                  {isBuilding ? 'Building...' : 'Rebuild Site'}
                </Button>
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
      </SidebarProvider>
    </TooltipProvider>
  )
}
