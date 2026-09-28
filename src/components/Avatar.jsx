import { useWash } from '../context/washStore.js'

export function Avatar({ user, size = 'md' }) {
  if (!user) return null
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ background: `linear-gradient(140deg, ${user.color || '#2563eb'}, ${user.color || '#2563eb'}bb)` }}
      aria-hidden="true"
    >
      {user.initials}
    </span>
  )
}

export function UserLine({ user, meta, action, className = '' }) {
  if (!user) return null
  return (
    <div className={`user-line ${className}`}>
      <Avatar user={user} />
      <div className="user-line__body">
        <strong>{user.name}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>
      {action}
    </div>
  )
}

export function useUser(id) {
  const { users } = useWash()
  return users.find((u) => u.id === id) || null
}
