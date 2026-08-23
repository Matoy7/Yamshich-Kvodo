/**
 * Menu glyphs.
 *
 * The project ships only six SVG assets (home, pencil, chat, bell, person,
 * quote), so settings and sign-out are drawn inline in the same flat, filled
 * style at the design system's 20px icon step. `currentColor` lets them take
 * the surrounding text colour.
 */

const SIZE = 20

type IconProps = { className?: string }

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm7.4-2.6a7.6 7.6 0 0 0 0-1.8l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.6-.9L15.1 4h-6.2l-.4 2.2c-.6.2-1.1.5-1.6.9l-2.3-.9-2 3.4 1.9 1.5a7.6 7.6 0 0 0 0 1.8l-1.9 1.5 2 3.4 2.3-.9c.5.4 1 .7 1.6.9l.4 2.2h6.2l.4-2.2c.6-.2 1.1-.5 1.6-.9l2.3.9 2-3.4-2-1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 8 6 12l4 4M6 12h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
