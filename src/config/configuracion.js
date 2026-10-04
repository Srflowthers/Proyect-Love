// ============================================================
// CONFIGURACIÓN PRINCIPAL
// Edita únicamente este archivo para personalizar la página.
// No hace falta tocar ningún componente.
// ============================================================

export const CONFIG = {
  // Fecha y hora en que comenzó la relación (formato ISO: AAAA-MM-DDTHH:mm:ss)
  fechaInicio: "2021-06-14T00:00:00",

  // Nombre de tu pareja (se usa en el mensaje final)
  nombrePareja: "Nombre",

  // Textos del hero (sección principal)
  titulo: "Nuestra historia ❤️",
  subtitulo: "Cada segundo contigo cuenta",

  // --------------------------------------------------------
  // MÚSICA (SPOTIFY)
  // Puedes usar una canción, playlist o álbum de Spotify.
  // Ve a Spotify, comparte tu canción/playlist y copia el enlace.
  // --------------------------------------------------------
  spotifyUrl: "https://open.spotify.com/intl-es/track/3lGMtkONrZdJ8kTCg6KIFf?si=7f148a03df1f45a0",

  // --------------------------------------------------------
  // FOTOGRAFÍAS
  // Coloca las imágenes en: public/fotos/
  // y agrega una línea aquí por cada imagen, con el mismo
  // nombre de archivo exacto (respeta mayúsculas/minúsculas).
  // El campo "alt" es el texto que describe la foto
  // (accesibilidad + aparece si la imagen no carga).
  // --------------------------------------------------------
  fotos: [
    { archivo: "foto-01.jpg", alt: "Nuestro primer recuerdo juntos" },
    { archivo: "foto-02.jpg", alt: "Un viaje inolvidable" },
    { archivo: "foto-03.jpg", alt: "Riendo como siempre" },
    { archivo: "foto-04.jpg", alt: "Una tarde especial" },
    { archivo: "foto-05.jpg", alt: "Celebrando juntos" },
    { archivo: "foto-06.jpg", alt: "Nuestro momento favorito" },
  ],

  // --------------------------------------------------------
  // LÍNEA DE TIEMPO DE LA RELACIÓN
  // Agrega, quita o edita los pasos que quieras.
  // --------------------------------------------------------
  historia: [
    {
      icono: "❤️",
      titulo: "El comienzo",
      texto: "El día que comenzó todo...",
    },
    {
      icono: "💕",
      titulo: "Nuestro primer recuerdo",
      texto: "Nuestro primer momento especial...",
    },
    {
      icono: "✨",
      titulo: "Momentos especiales",
      texto: "Todos los recuerdos que hemos creado...",
    },
    {
      icono: "❤️",
      titulo: "Hoy",
      texto: "Y todo lo que todavía nos queda por vivir.",
    },
  ],

  // --------------------------------------------------------
  // NUESTROS CUENTITOS
  // Puedes escribir tus propios cuentos o historias cortas aquí.
  // Cada cuento tiene un emoji, título, subtítulo y el texto de la historia.
  // --------------------------------------------------------
  cuentos: [
    {
      emoji: "📖",
      titulo: "El día que nos conocimos",
      subtitulo: "El inicio de nuestra gran aventura",
      texto: "Era un día cualquiera, pero el destino tenía preparado el mejor de los giros. Desde la primera palabra, la primera risa compartida, supimos que algo especial estaba naciendo. No fue coincidencia, fue el inicio del cuento más bonito que se haya escrito jamás."
    },
    {
      emoji: "✨",
      titulo: "Tus risas y mis días grises",
      subtitulo: "La magia de tu sonrisa",
      texto: "No hay día nublado que no se aclare con el sonido de tu risa. Es el refugio perfecto y la melodía que alegra mi alma. Cada pequeño chiste, cada broma y cada mirada cómplice son páginas mágicas que atesoro con todo el corazón."
    },
    {
      emoji: "💫",
      titulo: "Nuestras promesas bajo el cielo",
      subtitulo: "Mirando hacia el futuro juntos",
      texto: "Bajo la luz del cielo, prometimos acompañarnos en cada paso. No importa la distancia ni las tormentas, porque caminar de tu mano hace que todo valga la pena. Este cuento no ha hecho más que empezar, y lo mejor está por escribirse."
    }
  ],

  // --------------------------------------------------------
  // MENSAJE FINAL
  // Usa "\n\n" para separar párrafos.
  // --------------------------------------------------------
  mensajeFinal:
    "PARA Mosholate\n\nElla decidió darle una oportunidad porque lo amaba, y él decidió cambiar porque no quería perderla. Los dos eligieron luchar por su amor.",
  firmaFinal: "Te amo ❤️",
};
