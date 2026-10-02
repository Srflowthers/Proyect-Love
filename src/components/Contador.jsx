import { useEffect, useState } from 'react'
import { CONFIG } from '../config/configuracion.js'

/**
 * Calcula años completos + días/horas/minutos/segundos restantes
 * entre la fecha de inicio y el momento actual, así como totales absolutos.
 */
function calcularTiempo(fechaInicioISO) {
  const inicio = new Date(fechaInicioISO)
  const ahora = new Date()

  // Años completos transcurridos (respeta calendario, no solo ms/año)
  let years = ahora.getFullYear() - inicio.getFullYear()
  const aniversario = new Date(inicio)
  aniversario.setFullYear(inicio.getFullYear() + years)
  if (aniversario > ahora) {
    years -= 1
    aniversario.setFullYear(inicio.getFullYear() + years)
  }

  // Lo que queda desde el último "aniversario" hasta ahora, en milisegundos
  let restante = ahora.getTime() - aniversario.getTime()
  if (restante < 0) restante = 0

  const days = Math.floor(restante / (1000 * 60 * 60 * 24))
  const hours = Math.floor((restante / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((restante / (1000 * 60)) % 60)
  const seconds = Math.floor((restante / 1000) % 60)

  // Totales absolutos
  const totalMs = ahora.getTime() - inicio.getTime()
  const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24))
  const totalHours = Math.floor(totalMs / (1000 * 60 * 60))
  const totalSeconds = Math.floor(totalMs / 1000)

  return { years, days, hours, minutes, seconds, totalDays, totalHours, totalSeconds }
}

function dosDigitos(numero) {
  return String(numero).padStart(2, '0')
}

function formatearNumero(numero) {
  return new Intl.NumberFormat().format(numero)
}

function Unidad({ valor, etiqueta }) {
  return (
    <div className="unidad-tiempo">
      <span className="unidad-valor">{dosDigitos(valor)}</span>
      <span className="unidad-etiqueta">{etiqueta}</span>
    </div>
  )
}

export default function Contador() {
  const [tiempo, setTiempo] = useState(() => calcularTiempo(CONFIG.fechaInicio))

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempo(CONFIG.fechaInicio))
    }, 1000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="contador-wrapper">
      <div className="contador" role="timer" aria-live="off">
        <Unidad valor={tiempo.years} etiqueta={tiempo.years === 1 ? 'año' : 'años'} />
        <span className="contador-separador">·</span>
        <Unidad valor={tiempo.days} etiqueta="días" />
        <span className="contador-separador">·</span>
        <Unidad valor={tiempo.hours} etiqueta="horas" />
        <span className="contador-separador">·</span>
        <Unidad valor={tiempo.minutes} etiqueta="min" />
        <span className="contador-separador">·</span>
        <Unidad valor={tiempo.seconds} etiqueta="seg" />
      </div>

      <div className="contador-totales">
        <p className="totales-titulo">O lo que es lo mismo...</p>
        <div className="totales-grid">
          <div className="total-item">
            <span className="total-numero">{formatearNumero(tiempo.totalDays)}</span>
            <span className="total-etiqueta">días totales</span>
          </div>
          <div className="total-item">
            <span className="total-numero">{formatearNumero(tiempo.totalHours)}</span>
            <span className="total-etiqueta">horas totales</span>
          </div>
          <div className="total-item">
            <span className="total-numero">{formatearNumero(tiempo.totalSeconds)}</span>
            <span className="total-etiqueta">segundos totales</span>
          </div>
        </div>
      </div>
    </div>
  )
}
