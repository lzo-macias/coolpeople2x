import { useEffect, useRef } from 'react'
import '../styling/BouncingBallotGraphic.css'

const ballsData = [
  { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
]

const BouncingBallotGraphic = ({ onComplete }) => {
  const containerRef = useRef(null)
  const ballRefs = useRef([])
  const velocities = useRef([])
  const positions = useRef([])
  const paused = useRef([])
  const animationRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const gravity = 0.07
    const ballSize = 80
    const width = container.clientWidth
    const height = container.clientHeight

    const startingYs = ballsData.map(() => height - ballSize)

    velocities.current = ballsData.map(() => ({
      vx: 0,
      vy: 0,
    }))

    positions.current = ballsData.map((_, i) => ({
      x: Math.random() * (width - ballSize),
      y: startingYs[i],
    }))

    ballsData.forEach((_, i) => {
      const ball = ballRefs.current[i]
      if (ball) {
        ball.style.left = `${positions.current[i].x}px`
        ball.style.top = `${positions.current[i].y}px`
      }
    })

    paused.current = ballsData.map(() => true)

    // Stagger initial throws
    const launchDelays = [0, 50, 100, 150, 200, 250]

    ballsData.forEach((_, i) => {
      setTimeout(() => {
        velocities.current[i].vy = -Math.random() * 7 - 3
        velocities.current[i].vx = (Math.random() - 0.5) * 2
        paused.current[i] = false
      }, launchDelays[i] || 0)
    })

    const animate = () => {
      ballRefs.current.forEach((ball, i) => {
        if (!ball || paused.current[i]) {
          if (ball) ball.classList.add('paused')
          return
        } else {
          ball.classList.remove('paused')
        }

        velocities.current[i].vy += gravity
        positions.current[i].x += velocities.current[i].vx
        positions.current[i].y += velocities.current[i].vy

        // Bounce off walls
        if (positions.current[i].x < 0) {
          positions.current[i].x = 0
          velocities.current[i].vx *= -0.8
        }
        if (positions.current[i].x > width - ballSize) {
          positions.current[i].x = width - ballSize
          velocities.current[i].vx *= -0.8
        }

        // If it lands, pause and wait before next throw
        if (positions.current[i].y > startingYs[i]) {
          positions.current[i].y = startingYs[i]
          velocities.current[i].vy = 0
          velocities.current[i].vx = 0
          paused.current[i] = true
          ball.classList.add('paused')

          // Wait then re-throw
          const wait = Math.random() * 100 + 50
          setTimeout(() => {
            const centerX = width / 2
            const xPos = positions.current[i].x
            const direction = centerX - xPos

            const normalized = direction / centerX
            const strength = Math.random() * 5.5 + 2.5
            const randomness = (Math.random() - 0.5) * 1.5

            velocities.current[i].vx = normalized * strength + randomness
            velocities.current[i].vy = -Math.random() * 9 - 3

            paused.current[i] = false
            ball.classList.remove('paused')
          }, wait)

          return
        }

        ball.style.left = `${positions.current[i].x}px`
        ball.style.top = `${positions.current[i].y}px`
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div className="bouncing-ballot-container" ref={containerRef}>
      {ballsData.map((ball, index) => (
        <div
          key={index}
          className="bouncing-ballot-ball"
          ref={(el) => (ballRefs.current[index] = el)}
        />
      ))}
    </div>
  )
}

export default BouncingBallotGraphic
