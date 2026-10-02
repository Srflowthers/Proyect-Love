import { CONFIG } from '../config/configuracion.js'

export default function MensajeFinal() {
  const parrafos = CONFIG.mensajeFinal.split('\n\n')

  return (
    <section className="seccion mensaje-seccion" id="para-ti">
      <div className="mensaje-tarjeta">
        <h2 className="seccion-titulo">Para ti ❤️</h2>

        {parrafos.map((parrafo, i) => (
          <p key={i} className="mensaje-parrafo">
            {parrafo}
          </p>
        ))}

        <p className="mensaje-firma">{CONFIG.firmaFinal}</p>
      </div>
    </section>
  )
}
