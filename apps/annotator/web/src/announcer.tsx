/* Announcer — screen-reader live region.
   Mount <AnnouncerRoot/> once in App; call useAnnounce() anywhere to post messages. */

import { createContext, useCallback, useContext, useRef, useState } from "react"

interface AnnouncerContextValue {
  announce: (message: string, assertive?: boolean) => void
}

const AnnouncerContext = createContext<AnnouncerContextValue>({
  announce: () => undefined,
})

export function useAnnounce(): (message: string, assertive?: boolean) => void {
  return useContext(AnnouncerContext).announce
}

interface AnnouncerRootProps {
  children: React.ReactNode
}

export function AnnouncerRoot({ children }: AnnouncerRootProps) {
  const [polite, setPolite] = useState("")
  const [assertive, setAssertive] = useState("")
  // Use a counter to force re-render even when the message is the same text
  const counter = useRef(0)

  const announce = useCallback((message: string, isAssertive = false) => {
    counter.current++
    const msg = message + " ".repeat(counter.current % 3) // append invisible padding to force DOM update
    if (isAssertive) {
      setAssertive(msg)
    } else {
      setPolite(msg)
    }
  }, [])

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  )
}
