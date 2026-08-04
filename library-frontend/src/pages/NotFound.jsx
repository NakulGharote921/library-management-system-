import { useNavigate } from 'react-router-dom'
import { Home, Library } from 'lucide-react'
import Button from '../components/Button.jsx'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fadeIn">
      <div className="rounded-full bg-primary-50 p-6 text-primary-700 dark:bg-primary-950 dark:text-primary-100">
        <Library className="h-12 w-12" />
      </div>
      <p className="mt-6 text-5xl font-black text-gray-900 dark:text-gray-50">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The page you are looking for might have been moved, renamed, or is temporarily unavailable.
      </p>
      <div className="mt-8">
        <Button icon={Home} type="button" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
