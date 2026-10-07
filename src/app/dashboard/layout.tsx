import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { TenantSwitcher } from "@/components/tenant-switcher"
import { UserMenu } from "@/components/user-menu"
import { listMemberships, requireTenant } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, tenant } = await requireTenant()
  const rows = await listMemberships(user.id)
  const tenantOptions = rows.map((r) => ({ id: r.tenant.id, name: r.tenant.name }))

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 w-full">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6 mx-2" />
              <div className="flex flex-1 items-center justify-between">
                <TenantSwitcher tenants={tenantOptions} currentTenantId={tenant.id} />
                <UserMenu name={user.name} email={user.email} />
              </div>
            </header>
            <main className="flex-1 p-6 bg-muted/20">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
