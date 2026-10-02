import { CONFIG } from '../config/configuracion.js'

function obtenerEmbedUrl(url) {
  if (!url) return ''
  
  // Si ya tiene el formato embed, lo dejamos igual
  if (url.includes('spotify.com/embed/')) {
    return url
  }

  // Regex para extraer el tipo (track, playlist, album, artist) y el ID, ignorando localizaciones como intl-es
  const match = url.match(/spotify\.com\/(?:[a-zA-Z-]+\/)?(track|playlist|album|artist)\/([a-zA-Z0-9]+)/)
  if (match) {
    const tipo = match[1]
    const id = match[2]
    return `https://open.spotify.com/embed/${tipo}/${id}`
  }

  // Fallback por si acaso
  return url.replace('spotify.com/', 'spotify.com/embed/')
}

export default function Musica() {
  const embedUrl = obtenerEmbedUrl(CONFIG.spotifyUrl)

  if (!embedUrl) return null

  return (
    <section className="seccion musica-seccion" id="musica">
      <h2 className="seccion-titulo">te la dedico amor te amo u.u</h2>

      <div className="spotify-contenedor">
        <iframe
          src={embedUrl}
          width="100%"
          height="352"
          frameBorder="0"
          allowFullScreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 'none', borderRadius: '12px' }}
        ></iframe>
      </div>
    </section>
  )
}
