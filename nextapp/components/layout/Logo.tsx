'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const dims = { sm: 32, md: 40, lg: 56 }[size]
  const textSize = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }[size]

  return (
    <div className="flex items-center gap-3">
      <svg width={dims} height={dims} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#424242" />
        <circle cx="20" cy="20" r="17" fill="none" stroke="#424242" strokeWidth="2" />
        <text
          x="20"
          y="26"
          textAnchor="middle"
          fontFamily="Poppins, sans-serif"
          fontWeight="800"
          fontSize="16"
          fill="#64A1EE"
        >
          MC
        </text>
      </svg>
      {showText && (
        <div>
          <p className={`font-extrabold leading-none text-secondary ${textSize}`}>Campbell</p>
          <p className="text-[10px] font-medium text-primary uppercase tracking-widest">Consultoria Fitness</p>
        </div>
      )}
    </div>
  )
}
