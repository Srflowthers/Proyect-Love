import { useState } from 'react'
import { CONFIG } from '../config/configuracion.js'

export default function Cuentitos({ onClose }) {
  const [cuentoActivo, setCuentoActivo] = useState(CONFIG.cuentos?.[0] || null)

  if (!CONFIG.cuentos || CONFIG.cuentos.length === 0) return null

  return (
    <div className="lector-modal-pantalla-completa" role="dialog" aria-modal="true">
      <div className="lector-contenido-pantalla-completa">
        {/* Botón para cerrar y volver a la página principal */}
        <button 
          className="lector-cerrar-pantalla-completa" 
          onClick={onClose}
          aria-label="Volver al inicio"
        >
          ➔ Volver al Inicio
        </button>
        
        {/* Menú superior de navegación de cuentos */}
        <nav className="lector-menu-superior-pantalla-completa">
          {CONFIG.cuentos.map((cuento, index) => (
            <button
              key={index}
              className={`lector-menu-item-pantalla-completa ${cuentoActivo && cuento.titulo === cuentoActivo.titulo ? 'activo' : ''}`}
              onClick={() => setCuentoActivo(cuento)}
              aria-label={`Leer cuento: ${cuento.titulo}`}
            >
              <span className="menu-item-emoji">{cuento.emoji}</span>
              <span className="menu-item-titulo">{cuento.titulo}</span>
            </button>
          ))}
        </nav>

        {cuentoActivo && (
          <div className="lector-hoja-pantalla-completa">
            <div className="lector-encabezado">
              <span className="lector-emoji">{cuentoActivo.emoji}</span>
              <h3 className="lector-titulo">{cuentoActivo.titulo}</h3>
              <p className="lector-subtitulo">{cuentoActivo.subtitulo}</p>
              <div className="lector-divisor-decorativo"></div>
            </div>
            <p className="lector-texto">{cuentoActivo.texto}</p>
            <div className="lector-firma">Con amor ❤️</div>
          </div>
        )}
      </div>
    </div>
  )
}
