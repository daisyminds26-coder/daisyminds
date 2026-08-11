import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { cn } from '@/shared/lib/utils'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

interface UserAvatarProps {
  name: string
  avatarUrl?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'size-8 text-caption',
  md: 'size-9 text-body-sm',
  lg: 'size-12 text-body',
}

export function UserAvatar({ name, avatarUrl, className, size = 'md' }: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
