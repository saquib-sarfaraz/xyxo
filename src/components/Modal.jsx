import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, title, children, onClose, actions }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <Motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <Motion.div
            className="w-full max-w-lg glass-panel p-5"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-bold text-zinc-100">
                  {title}
                </div>
              </div>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 text-sm text-zinc-200">{children}</div>

            {actions ? (
              <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
            ) : null}
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
