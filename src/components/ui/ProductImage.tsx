import React, { useState, useEffect } from 'react'
import { Package } from 'lucide-react'

export function ProductImage({
  src,
  alt,
  className = 'h-10 w-10 rounded-lg',
  fallbackIconClass = 'h-5 w-5 text-stone-500'
}: {
  src?: string | null
  alt: string
  className?: string
  fallbackIconClass?: string
}): React.JSX.Element {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-ink-800 border border-white/[0.08] shrink-0 overflow-hidden ${className}`}
      >
        <Package className={fallbackIconClass} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`object-cover border border-white/[0.08] shrink-0 ${className}`}
    />
  )
}
