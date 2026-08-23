import { useId } from "react"
import type { InputHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/cn"

export type InputSize = "sm" | "md" | "lg"

/** Heights come from the same control scale as Button, so the two line up. */
const sizeStyles: Record<InputSize, string> = {
  sm: "h-8 px-3 text-body-sm",
  md: "h-10 px-3 text-body",
  lg: "h-12 px-4 text-body",
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string
  hint?: string
  error?: string
  inputSize?: InputSize
  iconStart?: ReactNode
  /** Adornment pinned inside the field at the inline end (counters, units). */
  trailing?: ReactNode
  /** Applied to the field wrapper rather than the <input> itself. */
  containerClassName?: string
}

/**
 * Text input with the product's standard control geometry and states
 * (default / focus / error / disabled). Shares its height scale with Button
 * so inputs and buttons line up when placed on the same row.
 */
export function Input({
  label,
  hint,
  error,
  inputSize = "md",
  iconStart,
  trailing,
  containerClassName,
  className,
  id,
  disabled,
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const invalid = Boolean(error)

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-label font-medium text-content-secondary"
        >
          {label}
        </label>
      ) : null}

      <div className="relative flex items-center">
        {iconStart ? (
          <span className="pointer-events-none absolute start-3 flex items-center text-content-muted">
            {iconStart}
          </span>
        ) : null}

        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={hint || error ? messageId : undefined}
          className={cn(
            "w-full rounded-md border bg-surface text-content-primary",
            "placeholder:text-content-muted transition-colors duration-150",
            /* Keeps the global :focus-visible outline so the field matches
               every other control's focus treatment. */
            "focus-visible:border-focus",
            sizeStyles[inputSize],
            Boolean(iconStart) && "ps-9",
            Boolean(trailing) && "pe-24",
            invalid
              ? "border-danger"
              : "border-border hover:border-border-strong",
            disabled && "cursor-not-allowed bg-surface-hover opacity-60",
            className,
          )}
          {...rest}
        />

        {trailing ? (
          <span className="pointer-events-none absolute end-4 flex items-center">
            {trailing}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={messageId} className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-caption text-content-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
