import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "tsparticles-slim"
import type { ISourceOptions } from "@tsparticles/engine"

const ParticleBackground = () => {
  const [init, setInit] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setInit(true)
    })
  }, [])

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: { value: "transparent" }
      },
      fpsLimit: 60,
      particles: {
        color: {
          value: ["#9333ea", "#3b82f6", "#06b6d4"]
        },
        links: {
          color: "#9333ea",
          distance: 150,
          enable: true,
          opacity: 0.2,
          width: 1,
        },
        move: {
          enable: true,
          speed: 1,
        },
        number: {
          density: {
            enable: true
          },
          value: 50
        },
        opacity: {
          value: 0.3
        },
        size: {
          value: { min: 1, max: 3 }
        },
      },
    }),
    []
  )

  return init ? (
    <Particles options={options} className="absolute inset-0 -z-10" />
  ) : null
}

export default ParticleBackground
