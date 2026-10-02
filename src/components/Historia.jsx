import { CONFIG } from '../config/configuracion.js'

export default function Historia() {
  return (
    <section className="seccion historia-seccion" id="historia">
      <h2 className="seccion-titulo">Nuestra historia</h2>

      <ol className="timeline">
        {CONFIG.historia.map((paso, index) => (
          <li className="timeline-item" key={index}>
            <span className="timeline-icono">{paso.icono}</span>
            <div className="timeline-contenido">
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
