import { useEffect, useState } from 'react'
import { CONFIG } from '../config/configuracion.js'

const RUTA_FOTOS = `${import.meta.env.BASE_URL}fotos/`

export default function Galeria() {
  const [seleccion, setSeleccion] = useState(null) // índice de la foto abierta o null

  useEffect(() => {
    function alPresionarTecla(e) {
      if (e.key === 'Escape') setSeleccion(null)
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [])

  return (
    <section className="seccion galeria-seccion" id="galeria">
      <h2 className="seccion-titulo">Nuestros recuerdos 📸</h2>

      <div className="galeria-grid">
        {CONFIG.fotos.map((foto, index) => (
          <button
            key={foto.archivo}
            className="galeria-item"
            onClick={() => setSeleccion(index)}
            aria-label={`Ver en grande: ${foto.alt}`}
          >
            <img
              src={`${RUTA_FOTOS}${foto.archivo}`}
              alt={foto.alt}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {seleccion !== null && (
        <div
          className="lightbox"
          onClick={() => setSeleccion(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="lightbox-cerrar"
            onClick={() => setSeleccion(null)}
            aria-label="Cerrar imagen"
          >
            ✕
          </button>
          <img
            className="lightbox-imagen"
            src={`${RUTA_FOTOS}${CONFIG.fotos[seleccion].archivo}`}
            alt={CONFIG.fotos[seleccion].alt}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
