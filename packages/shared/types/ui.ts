import { BotStatus, AIModel, MonsterStrength, ResourceType, BuildingType } from './bot'

// أنواع المكونات
export interface TabItem {
  key: string
  label: string
  icon: string
  component?: React.ComponentType
  disabled?: boolean
  badge?: number
}

export interface CardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  padding?: 'none' | 'small' | 'medium' | 'large'
}

export interface BadgeProps {
  label: string
  icon?: string
  bg: string
  color: string
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
}

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export interface InputProps {
  value: string | number
  onChange: (value: string | number) => void
  placeholder?: string
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'time'
  disabled?: boolean
  error?: string
  success?: boolean
  label?: string
  helperText?: string
}

// أنواع النماذج
export interface BotSettingsForm {
  security: {
    antiDetection: boolean
    randomDelays: boolean
    maxActionsPerHour: number
    useProxy: boolean
    proxyAddress: string
    humanizeMouse: boolean
    avoidPatterns: boolean
  }
  automation: {
    autoFarm: boolean
    autoBuild: boolean
    autoResearch: boolean
    autoUpgrade: boolean
    targetLevel: number
    priorityBuilding: BuildingType
    upgradeQueue: BuildingType[]
  }
  resources: Record<ResourceType, boolean> & {
    autoCollect: boolean
    minResourceThreshold: number
  }
  combat: {
    huntMonsters: boolean
    monsterStrength: MonsterStrength
    autoJoinRallies: boolean
    supportAllies: boolean
    autoHeal: boolean
    crowdSupport: boolean
    troopPresets: string[]
  }
  messaging: {
    autoSendGifts: boolean
    giftMessage: string
    recipients: string[]
    checkMail: boolean
    replyToAlliance: boolean
  }
  ai: {
    enabled: boolean
    learningMode: boolean
    optimizeStrategy: boolean
    predictAttacks: boolean
    autoAdjust: boolean
    visionModel: AIModel
  }
  scheduling: {
    enabled: boolean
    startTime: string
    endTime: string
    pauseDuringEvents: boolean
    stopOnLowResources: boolean
  }
}