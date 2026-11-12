import muhePhoto from '@/assets/agents/muhe.svg'
import asepPhoto from '@/assets/agents/asep.svg'
import ucupPhoto from '@/assets/agents/ucup.svg'
import bambangPhoto from '@/assets/agents/bambang.svg'

export type AgentId = 'muhe' | 'asep' | 'ucup' | 'bambang'

export interface AgentProfile {
  id: AgentId
  name: string
  role: string
  duty: string
  photo: string
  accent: string
  href: string
}

export const agentProfiles: Record<AgentId, AgentProfile> = {
  muhe: {
    id: 'muhe',
    name: 'Muhe',
    role: 'Head Agent',
    duty: 'Orchestrator',
    photo: muhePhoto,
    accent: '#F5D64B',
    href: '/app/automations',
  },
  asep: {
    id: 'asep',
    name: 'Asep',
    role: 'Finance Agent',
    duty: 'Keuangan & arus kas',
    photo: asepPhoto,
    accent: '#F58FD9',
    href: '/app/finance/overview',
  },
  ucup: {
    id: 'ucup',
    name: 'Ucup',
    role: 'Seller Agent',
    duty: 'Marketplace & inventori',
    photo: ucupPhoto,
    accent: '#F0512B',
    href: '/app/seller/overview',
  },
  bambang: {
    id: 'bambang',
    name: 'Bambang',
    role: 'Content Agent',
    duty: 'Produksi & distribusi konten',
    photo: bambangPhoto,
    accent: '#24C7C4',
    href: '/app/content/overview',
  },
}

export const agentList = Object.values(agentProfiles)
