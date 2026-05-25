interface Props {
  recommendation: 'Buy' | 'Wait' | 'Skip'
  size?: 'sm' | 'md' | 'lg'
}

const CONFIG = {
  Buy:  { gradient: 'from-green-500 to-green-600', icon: '✅', label: 'BUY'  },
  Wait: { gradient: 'from-yellow-400 to-yellow-500', icon: '⚠️', label: 'WAIT' },
  Skip: { gradient: 'from-red-500 to-red-600',   icon: '❌', label: 'SKIP' },
}

const SIZES = {
  sm: 'px-2 py-1 text-[10px] gap-1',
  md: 'px-3 py-1.5 text-xs gap-1',
  lg: 'px-4 py-2 text-sm gap-1.5',
}

export default function RecommendationBadge({ recommendation, size = 'md' }: Props) {
  const { gradient, icon, label } = CONFIG[recommendation]
  return (
    <span className={`
      inline-flex items-center shrink-0 bg-gradient-to-r ${gradient}
      text-white font-bold uppercase tracking-wide rounded-full shadow-md
      ${SIZES[size]}
    `}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
