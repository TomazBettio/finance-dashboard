// Registry puro de módulos do produto: sem imports de servidor/db,
// pode ser importado por componentes client e server.
export type ModuleKey = 'inventory' | 'sales' | 'finance' | 'invoices'

export type ModuleDefinition = {
  key: ModuleKey
  name: string
  description: string
  status: 'available' | 'coming_soon'
  defaultEnabled: boolean
  dependsOn: ModuleKey[]
  nav: { title: string; url: string; icon: string }[]
}

export const MODULES: ModuleDefinition[] = [
  {
    key: 'inventory',
    name: 'Estoque',
    description: 'Produtos, quantidades e movimentações de estoque.',
    status: 'available',
    defaultEnabled: true,
    dependsOn: [],
    nav: [{ title: 'Produtos (Estoque)', url: '/dashboard/inventory', icon: 'package' }],
  },
  {
    key: 'sales',
    name: 'Vendas',
    description: 'Pedidos e vendas.',
    status: 'coming_soon',
    defaultEnabled: false,
    dependsOn: [],
    nav: [],
  },
  {
    key: 'finance',
    name: 'Financeiro',
    description: 'Contas a pagar e a receber.',
    status: 'coming_soon',
    defaultEnabled: false,
    dependsOn: [],
    nav: [],
  },
  {
    key: 'invoices',
    name: 'Notas Fiscais',
    description: 'Emissão de NF-e.',
    status: 'coming_soon',
    defaultEnabled: false,
    dependsOn: ['sales'],
    nav: [],
  },
]

export function getModule(key: ModuleKey): ModuleDefinition | undefined {
  return MODULES.find((m) => m.key === key)
}

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && MODULES.some((m) => m.key === value)
}
