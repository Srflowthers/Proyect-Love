import { useState, useEffect, useMemo } from 'react'

// Cantidad máxima de corazones al inicio (cabecera)
const CANTIDAD_MAX = 35

function generarCorazones() {
  return Array.from({ length: CANTIDAD_MAX }).map((_, i) => ({
    id: i,
    left: Math.random() * 100, // posición horizontal en %
    size: 10 + Math.random() * 22, // 10px a 32px
    duration: 12 + Math.random() * 12, // 12s a 24s
    delay: Math.random() * -20, // arranca "a mitad" de su ciclo
    opacity: 0.15 + Math.random() * 0.35,
  }))
}

export default function Corazones() {
  const corazones = useMemo(generarCorazones, [])
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // A medida que el usuario baja (hasta 600px de scroll), disminuye la cantidad y opacidad
  const limiteScroll = 600
  const ratio = Math.min(scrollY / limiteScroll, 1) // de 0 a 1
  
  // Reducimos la cantidad de corazones activos (mínimo 6 corazones de fondo)
  const cantidadVisible = Math.max(6, Math.ceil(CANTIDAD_MAX * (1 - ratio)))
  const corazonesVisibles = useMemo(() => corazones.slice(0, cantidadVisible), [cantidadVisible, corazones])

  // Reducimos la opacidad general para "limpiar" el fondo del texto
  const opacidadGeneral = 1 - ratio * 0.7 // baja del 100% al 30% de su opacidad original

  return (
    <div 
      className="corazones-fondo" 
      aria-hidden="true"
      style={{ 
        opacity: opacidadGeneral,
        transition: 'opacity 0.3s ease-out'
      }}
    >
      {corazonesVisibles.map((c) => (
        <span
          key={c.id}
          className="corazon-flotante"
          style={{
            left: `${c.left}%`,
            fontSize: `${c.size}px`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            opacity: c.opacity,
          }}
        >
          ❤
        </span>
      ))}
    </div>
  )
}
