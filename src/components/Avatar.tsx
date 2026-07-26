function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function Avatar({
  src,
  name,
  size = 40,
  className = '',
}: {
  src?: string | null
  name: string
  size?: number
  className?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`flex items-center justify-center rounded-full bg-emerald-600 font-medium text-white ${className}`}
    >
      {initials(name)}
    </div>
  )
}
