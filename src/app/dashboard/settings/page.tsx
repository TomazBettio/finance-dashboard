import { db } from '@/lib/db'
import { movementReasons } from '@/modules/inventory/schema'
import { requireTenant } from '@/lib/auth/session'
import { getEnabledModuleKeys } from '@/lib/modules'
import { MODULES } from '@/modules/registry'
import { getProductFieldDefs } from '@/modules/custom-fields/queries'
import { eq } from 'drizzle-orm'
import { ReasonForm } from '@/components/settings/reason-form'
import { SettingsCard } from '@/components/settings/settings-card'
import { ModuleToggle } from '@/components/settings/module-toggle'
import { CustomFieldsManager } from '@/components/settings/custom-field-form'
import { deleteMovementReason } from '@/modules/settings/actions'
import { Blocks, ListPlus, Tag, Trash2 } from 'lucide-react'

export default async function SettingsPage() {
  const { tenant, role } = await requireTenant()
  const enabledModules = await getEnabledModuleKeys(tenant.id)
  const canManage = role === 'owner' || role === 'admin'
  const inventoryEnabled = enabledModules.has('inventory')

  const reasons = inventoryEnabled
    ? await db
        .select({ id: movementReasons.id, name: movementReasons.name, type: movementReasons.type })
        .from(movementReasons)
        .where(eq(movementReasons.tenantId, tenant.id))
        .orderBy(movementReasons.type, movementReasons.name)
    : []

  const fieldDefs = inventoryEnabled ? await getProductFieldDefs(tenant.id) : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie os parâmetros do sistema.</p>
      </div>

      <SettingsCard
        title="Módulos"
        description="Funcionalidades disponíveis nesta empresa."
        icon={<Blocks className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border">
            {MODULES.map((mod) => (
              <div
                key={mod.key}
                className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-0"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {mod.name}
                    {mod.status === 'coming_soon' && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Em breve
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </div>
                {mod.status === 'available' && (
                  <ModuleToggle
                    moduleKey={mod.key}
                    enabled={enabledModules.has(mod.key)}
                    disabled={!canManage}
                  />
                )}
              </div>
            ))}
          </div>
          {!canManage && (
            <p className="text-xs text-muted-foreground">
              Somente owner/admin podem ativar ou desativar módulos.
            </p>
          )}
        </div>
      </SettingsCard>

      {inventoryEnabled && (
        <SettingsCard
          title="Motivos de Movimentação"
          description="Categorias usadas ao registrar entradas e baixas de estoque."
          icon={<Tag className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border">
              {reasons.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum motivo cadastrado
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nome</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {reasons.map((reason) => (
                      <tr key={reason.id} className="group border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{reason.name}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              reason.type === 'entry'
                                ? 'bg-[#818cf8]/15 text-[#818cf8]'
                                : 'bg-[#f87171]/15 text-[#f87171]'
                            }`}
                          >
                            {reason.type === 'entry' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <form action={deleteMovementReason.bind(null, reason.id)}>
                            <button
                              type="submit"
                              disabled={!canManage}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 ml-auto"
                              aria-label={`Excluir ${reason.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {canManage ? (
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">Adicionar motivo</p>
                <ReasonForm />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Somente owner/admin podem cadastrar ou excluir motivos.
              </p>
            )}
          </div>
        </SettingsCard>
      )}

      {inventoryEnabled && (
        <SettingsCard
          title="Campos personalizados — Produtos"
          description="Campos extras aplicados aos produtos desta empresa."
          icon={<ListPlus className="h-4 w-4" />}
        >
          <CustomFieldsManager defs={fieldDefs} canManage={canManage} />
        </SettingsCard>
      )}
    </div>
  )
}
