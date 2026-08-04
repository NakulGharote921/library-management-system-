import { forwardRef, useId } from 'react'

const FormInput = forwardRef(function FormInput(
  {
    label,
    id,
    error,
    icon: Icon,
    className = '',
    inputClassName = '',
    type = 'text',
    ...rest
  },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <div className={`relative ${className}`}>
      {Icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder=" "
        className={`peer block w-full appearance-none rounded-lg border bg-white px-3 pb-2.5 pt-4 text-sm text-gray-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:bg-gray-900 dark:text-gray-100 ${
          Icon ? 'pl-10' : ''
        } ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className={`pointer-events-none absolute start-3 top-2 z-10 origin-[0] -translate-y-4 scale-75 transform bg-white px-1 text-sm text-gray-500 duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-primary-600 dark:bg-gray-900 ${
          Icon ? 'start-10' : ''
        }`}
      >
        {label}
      </label>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export default FormInput
