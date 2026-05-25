import { Home, FileText, Database, Users, Settings } from "lucide-react"
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

const navItems = [
  { title: "Dashboard", icon: Home, url: "#" },
  { title: "Pages", icon: FileText, url: "#" },
  { title: "Data", icon: Database, url: "#" },
  { title: "Team", icon: Users, url: "#" },
  { title: "Settings", icon: Settings, url: "#" },
]

export function AppSidebar() {
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
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    className="rounded-md hover:bg-zinc-50 transition-colors text-sm text-zinc-900 tracking-[-0.02em] py-2 px-3 h-auto"
                    render={
                      <a href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 stroke-[1.5px] text-zinc-500" />
                        <span>{item.title}</span>
                      </a>
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
