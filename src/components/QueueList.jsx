import { Crown, ListOrdered, LogOut, Phone, UserPlus } from 'lucide-react'
import { useWash } from '../context/washStore.js'

export default function QueueList({ machine, compact = false }) {
  const { users, currentUserId, joinQueue, leaveQueue, bookings } = useWash()
  const queue = machine.queue
  const myIndex = queue.indexOf(currentUserId)
  const hasActiveBooking = bookings.some(
    (b) => b.userId === currentUserId && b.machineId === machine.id && ['scheduled', 'due', 'started'].includes(b.status),
  )
  const canJoin = machine.status !== 'offline' && myIndex === -1 && !hasActiveBooking

  return (
    <div className={`queue ${compact ? 'queue--compact' : ''}`}>
      <div className="queue__head">
        <h4>
          <ListOrdered size={16} /> Waiting queue
        </h4>
        <span className="queue__count">{queue.length} waiting</span>
      </div>

      {queue.length === 0 ? (
        <p className="queue__empty">Nobody is waiting. This machine is free for the next student.</p>
      ) : (
        <ol className="queue__list">
          {queue.map((userId, index) => {
            const user = users.find((u) => u.id === userId)
            if (!user) return null
            const isMe = user.id === currentUserId
            return (
              <li key={userId} className={`queue__item ${isMe ? 'is-me' : ''}`}>
                <span className={`queue__pos ${index === 0 ? 'is-first' : ''}`}>{index + 1}</span>
                <span className="queue__avatar" style={{ background: user.color }}>
                  {user.initials}
                </span>
                <div className="queue__meta">
                  <strong>
                    {user.name} {isMe ? <em>(you)</em> : null}
                    {index === 0 ? (
                      <span className="queue__crown">
                        <Crown size={12} /> next
                      </span>
                    ) : null}
                  </strong>
                  <span>Room {user.room}</span>
                </div>
                {isMe ? (
                  <span className="queue__position">Position {index + 1}</span>
                ) : (
                  <a className="btn btn--ghost btn--xs" href={`tel:${user.phone}`}>
                    <Phone size={13} /> Call
                  </a>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {currentUserId ? (
        <div className="queue__actions">
          {myIndex >= 0 ? (
            <button type="button" className="btn btn--soft btn--sm" onClick={() => leaveQueue(machine.id)}>
              <LogOut size={15} /> Leave queue
            </button>
          ) : (
            <button type="button" className="btn btn--outline btn--sm" onClick={() => joinQueue(machine.id)} disabled={!canJoin}>
              <UserPlus size={15} /> {hasActiveBooking ? 'You already have a slot' : 'Join queue'}
            </button>
          )}
          {myIndex >= 0 ? (
            <span className="queue__hint">
              You are <strong>#{myIndex + 1}</strong> in line for {machine.name}.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
