import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/25 hover:from-primary-500 hover:to-primary-600 active:scale-[0.98]',
  secondary:
    'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]',
  danger:
    'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:from-red-400 hover:to-red-500 active:scale-[0.98]',
  success:
    'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98]',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    loading = false,
    disabled,
    icon: Icon,
    type = 'button',
    ...rest
  },
  ref,
) {
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 ${v} ${s} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  )
})

export default Button
