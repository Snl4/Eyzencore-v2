'use client'

import Image from 'next/image'

type ProjectLogoProps = {
  src?: string | null
  alt: string
  size?: number
  className?: string
}

const DEFAULT_PROJECT_LOGO = '/project-default-logo.png'

export function ProjectLogo({
  src,
  alt,
  size = 44,
  className = 'project-card-logo',
}: ProjectLogoProps) {
  return (
    <Image
      src={src || DEFAULT_PROJECT_LOGO}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}
