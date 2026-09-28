import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Cpu, Radio, Timer, WashingMachine } from 'lucide-react'
import { useWash } from '../context/washStore.js'

const HIGHLIGHTS = [
  { icon: Timer, label: 'Live countdown' },
  { icon: Radio, label: 'Motion sensors' },
  { icon: Cpu, label: 'Smart queue' },
]

export default function Splash() {
  const navigate = useNavigate()
  const { currentUser } = useWash()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1900)
    const t2 = setTimeout(() => navigate(currentUser ? '/dashboard' : '/login', { replace: true }), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [navigate, currentUser])

  const go = () => {
    setLeaving(true)
    setTimeout(() => navigate(currentUser ? '/dashboard' : '/login', { replace: true }), 220)
  }

  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`}>
      <div className="splash__glow" />
      <div className="splash__content">
        <div className="splash__machine">
          <div className="splash__drum">
            <WashingMachine size={54} />
          </div>
          <div className="splash__bubbles">
            <span />
            <span />
            <span />
          </div>
        </div>

        <h1 className="splash__title">
          Wash<span>Track</span>
        </h1>
        <p className="splash__tagline">Smart hostel washing machine management system</p>

        <div className="splash__highlights">
          {HIGHLIGHTS.map((item) => (
            <span key={item.label} className="splash__chip">
              <item.icon size={15} /> {item.label}
            </span>
          ))}
        </div>

        <div className="splash__loader">
          <span />
        </div>

        <button type="button" className="btn btn--primary btn--lg" onClick={go}>
          Enter WashTrack <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
