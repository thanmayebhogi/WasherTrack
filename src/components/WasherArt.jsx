export default function WasherArt({ status, size = 'md' }) {
  return (
    <div className={`washer washer--${size} washer--${status}`} aria-hidden="true">
      <div className="washer__top">
        <span className="washer__screen">
          <span className="washer__screen-dot" />
        </span>
        <span className="washer__knob" />
      </div>
      <div className={`washer__door ${status === 'running' ? 'is-spinning' : ''}`}>
        <div className="washer__glass">
          <div className="washer__clothes" />
        </div>
      </div>
      <div className="washer__feet" />
    </div>
  )
}
