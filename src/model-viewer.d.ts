import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        alt?: string
        loading?: 'auto' | 'lazy' | 'eager'
        reveal?: 'auto' | 'interaction' | 'manual'
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'auto-rotate-delay'?: number
        'rotation-per-second'?: string
        'camera-orbit'?: string
        'min-camera-orbit'?: string
        'max-camera-orbit'?: string
        'field-of-view'?: string
        'shadow-intensity'?: string
        'shadow-softness'?: string
        exposure?: string
        'environment-image'?: string
        'interaction-prompt'?: 'auto' | 'none'
      }
    }
  }
}

export {}
