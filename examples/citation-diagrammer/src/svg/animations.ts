import type { DiagramTheme } from "../types"

/**
 * Generate the embedded CSS <style> block for SVG animations and microinteractions.
 * All animations are pure CSS — no JavaScript in the SVG output.
 */
export function generateAnimationStyles(theme: DiagramTheme): string {
  return `<style>
  /* ── Entrance Animations ── */

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes scaleIn {
    0%   { opacity: 0; transform: scale(0); }
    60%  { opacity: 1; transform: scale(1.06); }
    80%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes labelReveal {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 0.7; transform: translateY(0); }
  }

  /* ── Looping Animations ── */

  @keyframes confidencePulse {
    0%, 100% { opacity: 0.55; }
    50%      { opacity: 0.85; }
  }

  /* ── Initial States ── */

  .dc-badge {
    opacity: 0;
    animation: slideInLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .dc-confidence {
    opacity: 0;
    animation: fadeIn 0.3s ease 150ms forwards;
  }

  .dc-source-text {
    opacity: 0;
    animation: fadeIn 0.4s ease 200ms forwards;
  }

  .dc-node {
    opacity: 0;
    transform-origin: center center;
    transform-box: fill-box;
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .dc-label {
    opacity: 0;
    animation: labelReveal 0.3s ease forwards;
  }

  .dc-relation {
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
  }

  /* ── Hover Microinteractions ── */

  .dc-node {
    cursor: pointer;
    transition: filter 0.2s ease;
  }

  .dc-node:hover {
    filter: drop-shadow(0 4px 12px var(--glow-color, rgba(0,0,0,0.15)));
  }

  .dc-node:hover rect {
    stroke-width: 2.5;
    transition: stroke-width 0.15s ease;
  }

  .dc-node:hover .dc-label {
    opacity: 1 !important;
    font-weight: 700;
    transition: opacity 0.15s ease, font-weight 0.15s ease;
  }

  .dc-node:hover .dc-value {
    font-weight: 700;
    transition: font-weight 0.15s ease;
  }

  .dc-source-underline {
    transition: stroke-width 0.15s ease, opacity 0.15s ease;
  }

  /* ── Confidence Pulse ── */

  .dc-low-confidence {
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               confidencePulse 2.5s ease-in-out 1.5s infinite;
  }

  /* ── SVG Defs ── */
</style>`
}

/**
 * Generate SVG <defs> block with shared markers and filters.
 */
export function generateDefs(theme: DiagramTheme): string {
  return `<defs>
  <!-- Arrowhead marker for relation connectors -->
  <marker id="arrowhead" viewBox="0 0 10 7" refX="10" refY="3.5"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
    <polygon points="0 0, 10 3.5, 0 7" fill="${theme.connectorColor}"/>
  </marker>

  <!-- Subtle drop shadow filter -->
  <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/>
  </filter>
</defs>`
}
