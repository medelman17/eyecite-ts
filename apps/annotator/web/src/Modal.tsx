/* Modal — accessible dialog wrapper.
   Traps focus, restores focus on unmount, closes on Esc, sets role/aria. */

import { useEffect, useRef } from "react"

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  onClose: () => void
  /** id of the heading element inside the modal, used for aria-labelledby */
  labelledById: string
  children: React.ReactNode
}

export function Modal({ onClose, labelledById, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Save and restore focus
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null

    // Move focus into dialog on mount
    const dialog = dialogRef.current
    if (dialog) {
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE)
      if (first) {
        first.focus()
      } else {
        dialog.focus()
      }
    }

    return () => {
      returnFocus.current?.focus()
    }
  }, [])

  // Trap Tab/Shift+Tab and close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      {children}
    </div>
  )
}
