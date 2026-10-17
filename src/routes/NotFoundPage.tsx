import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'

export default function NotFoundPage() {
  return (
    <div className="flow">
      <EmptyState
        icon="info"
        title="Page not found"
        message="That page doesn’t exist or has moved."
        action={<ButtonLink to="/">Back home</ButtonLink>}
      />
    </div>
  )
}
