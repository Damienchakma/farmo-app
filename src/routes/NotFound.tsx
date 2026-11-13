import { ArrowLeft, Compass, LayoutGrid } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { OffFieldIllustration } from '@/components/brand/brand'
import { Button } from '@/components/ui/controls'
import { HandRule } from '@/components/ui/surfaces'

export function NotFoundRoute() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex max-w-[620px] flex-col items-center py-10 text-center sm:py-16">
      <div className="text-soil-300">
        <OffFieldIllustration className="w-[220px]" />
      </div>
      <p className="eyebrow mt-4">Error 404</p>
      <h1 className="mt-2 font-display text-3xl text-ink">This plot is not on the map</h1>
      <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-ink-2">
        The page you asked for does not exist in the demo. It may have been a farm that was deleted, a project that was
        renamed, or a link typed by hand. Everything still lives under Projects.
      </p>
      <HandRule className="my-6 max-w-[280px]" />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" icon={<LayoutGrid />} onClick={() => navigate('/projects')}>
          Go to projects
        </Button>
        <Button variant="outline" icon={<ArrowLeft />} onClick={() => navigate(-1)}>
          Back to the previous page
        </Button>
      </div>
      <p className="mt-6 text-xs text-ink-3">
        Looking for the API instead?{' '}
        <Link to="/developers" className="link inline-flex items-center gap-1">
          <Compass size={11} aria-hidden />
          Open the developer console
        </Link>
      </p>
    </div>
  )
}
