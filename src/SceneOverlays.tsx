import type { CSSProperties } from 'react'
import type { LayerId, Mode } from './data'

export default function SceneOverlays({
  mode,
  activeLayers,
  hour,
}: {
  mode: Mode
  activeLayers: LayerId[]
  hour: number
}) {
  return (
    <div className="scene-overlays" aria-hidden="true">
      {activeLayers.includes('slope') && <div className="analysis-overlay slope-overlay" />}
      {activeLayers.includes('sun') && (
        <div
          className="analysis-overlay sun-overlay"
          style={{ '--sun-shift': `${(hour - 6) * 4}%` } as CSSProperties}
        />
      )}
      {activeLayers.includes('view') && <div className="analysis-overlay view-overlay" />}
      {activeLayers.includes('noise') && (
        <div className={`analysis-overlay noise-overlay ${mode}`} />
      )}
      {activeLayers.includes('flow') && (
        <svg className="flow-overlay" viewBox="0 0 1000 640" preserveAspectRatio="none">
          {mode === 'rural' ? (
            <>
              <path d="M 248 20 C 210 135, 286 212, 230 330 S 146 522, 62 640" />
              <path d="M 612 30 C 580 154, 640 224, 562 330 S 474 510, 390 640" />
              <path d="M 818 90 C 762 188, 816 274, 734 378 S 636 548, 594 640" />
            </>
          ) : (
            <>
              <path d="M 42 570 C 240 548, 390 578, 590 548 S 830 512, 1000 530" />
              <path d="M 140 610 C 354 574, 506 616, 762 580 S 900 558, 1000 572" />
            </>
          )}
        </svg>
      )}
    </div>
  )
}
