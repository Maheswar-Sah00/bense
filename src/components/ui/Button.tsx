import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'tertiary'
type Size = 'sm' | 'lg'

interface StyleProps {
  variant?: Variant
  size?: Size
  block?: boolean
  icon?: IconName
}

function classes({ variant = 'primary', size = 'lg', block }: StyleProps, extra?: string) {
  return ['btn', `btn-${variant}`, `btn-${size}`, block && 'btn-block', extra].filter(Boolean).join(' ')
}

function Content({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </>
  )
}

export function Button({
  variant,
  size,
  block,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes({ variant, size, block }, className)} {...rest}>
      <Content icon={icon}>{children}</Content>
    </button>
  )
}

export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: StyleProps & LinkProps) {
  return (
    <Link className={classes({ variant, size, block }, className)} {...rest}>
      <Content icon={icon}>{children}</Content>
    </Link>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
}

/** Round outlined icon button, as used in the reference header. */
export function IconButton({ icon, label, className, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={['icon-btn', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  )
}

export function IconLink({ icon, label, ...rest }: { icon: IconName; label: string } & LinkProps) {
  return (
    <Link className="icon-btn" aria-label={label} {...rest}>
      <Icon name={icon} size={20} />
    </Link>
  )
}
