import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { oauthLogin } from '../store/authSlice.js'
import { KODNEST_LOGO_URL } from '../constants/branding.js'

export default function OAuthCallback() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const error = params.get('error')
    if (error) {
      toast.error(error === 'account_disabled' ? 'Your account has been disabled' : "We couldn't complete your Google sign-in. Please try again.")
      navigate('/login', { replace: true })
      return
    }

    const token = params.get('token')
    if (!token) {
      toast.error("We couldn't complete your Google sign-in. Please try again.")
      navigate('/login', { replace: true })
      return
    }

    dispatch(oauthLogin({
      token,
      id: Number(params.get('id')),
      name: params.get('name'),
      email: params.get('email'),
      role: params.get('role'),
    })).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Signed in with Google')
      } else {
        toast.error("We couldn't complete your Google sign-in. Please try again.")
      }
      navigate('/', { replace: true })
    })
  }, [dispatch, navigate, params])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-sky-800 px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-gray-900">
          <img src={KODNEST_LOGO_URL} alt="KodNest" className="mx-auto h-10 w-auto" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50">Signing you in…</h1>
          <p className="mt-1 text-sm text-gray-500">Completing Google sign-in</p>
          <div className="mt-6 flex justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}
