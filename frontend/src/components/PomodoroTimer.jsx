import { useEffect, useState } from 'react'

const presets = [
  { label: 'Focus 25', minutes: 25 },
  { label: 'Deep 45', minutes: 45 },
  { label: 'Break 10', minutes: 10 },
]

function PomodoroTimer() {
  const [activePreset, setActivePreset] = useState(presets[0])
  const [secondsLeft, setSecondsLeft] = useState(activePreset.minutes * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setSecondsLeft(activePreset.minutes * 60)
    setRunning(false)
  }, [activePreset])

  useEffect(() => {
    if (!running) return undefined

    const timerId = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerId)
  }, [running])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="panel-card timer-card">
      <div className="panel-header">
        <h3>Pomodoro Timer</h3>
        <span className="panel-pill">{activePreset.label}</span>
      </div>
      <div className="timer-display">
        {minutes}:{seconds}
      </div>
      <div className="timer-controls">
        <button
          className="ghost-btn"
          type="button"
          onClick={() => setRunning((prev) => !prev)}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          className="ghost-btn"
          type="button"
          onClick={() => setSecondsLeft(activePreset.minutes * 60)}
        >
          Reset
        </button>
      </div>
      <div className="timer-presets">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className={preset.label === activePreset.label ? 'primary-btn' : 'ghost-btn'}
            type="button"
            onClick={() => setActivePreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PomodoroTimer
