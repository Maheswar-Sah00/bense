import { Link } from 'react-router-dom'

/** Always visible in demo mode, so nobody mistakes an example for a live result. */
export function DemoBar() {
  return (
    <div className="demo-mode-bar" role="note">
      <span>
        <strong>Demo mode.</strong> Examples only; nothing is sent.
      </span>
      <Link to="/" className="text-link">
        Exit
      </Link>
    </div>
  )
}
