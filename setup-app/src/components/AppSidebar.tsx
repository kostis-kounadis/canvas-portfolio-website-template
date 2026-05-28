import { Fingerprint, Palette, LayoutTemplate, Layers, Image as ImageIcon, Rocket, Image, HelpCircle } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useConfigStore } from "@/lib/store"

const navItems = [
  { id: "identity", title: "Identity & SEO", icon: Fingerprint },
  { id: "theme", title: "Theme & Styling", icon: Palette },
  { id: "layouts", title: "Layouts", icon: LayoutTemplate },
  { id: "images", title: "Image Settings", icon: ImageIcon },
  { id: "modules", title: "Modules", icon: Layers },
  { id: "favicon", title: "Favicon & Assets", icon: Image },
  { id: "deployment", title: "Deployment", icon: Rocket },
  { id: "help", title: "Help & Guide", icon: HelpCircle },
]

export function AppSidebar() {
  const { activeSection, setActiveSection } = useConfigStore()

  return (
    <Sidebar className="border-r border-zinc-200 bg-white">
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-zinc-500 tracking-[-0.02em] px-3 pt-4 pb-2">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    isActive={activeSection === item.id}
                    onClick={() => setActiveSection(item.id)}
                    className="rounded-md hover:bg-zinc-50 transition-colors text-sm text-zinc-900 tracking-[-0.02em] py-2 px-3 h-auto"
                    render={
                      <button className="flex w-full items-center gap-2">
                        <item.icon className="h-4 w-4 stroke-[1.5px] text-zinc-500" />
                        <span>{item.title}</span>
                      </button>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
