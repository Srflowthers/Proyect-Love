import React from 'react';

const TermsModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111] border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-scaleUp overflow-hidden">
        
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-xl md:text-2xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            Términos y Condiciones
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-gray-300 text-sm space-y-4 prose prose-invert max-w-none prose-pink">
          <p><strong>Última actualización:</strong> 10 de Octubre de 2026<br/>
          <strong>Legislación aplicable:</strong> Ley N° 19.628 sobre Protección de la Vida Privada de la República de Chile.</p>

          <p>Bienvenido/a a nuestra plataforma. Al registrarte, aceptas someterte a los presentes Términos y Políticas de Privacidad.</p>

          <h3 className="text-pink-400 font-bold mt-6 mb-2">1. Privacidad y Propiedad Absoluta</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Propiedad:</strong> Mantienes el 100% de la propiedad intelectual sobre todas las imágenes, videos, audios y cartas.</li>
            <li><strong>Cero Venta de Datos:</strong> Nos comprometemos legalmente a NUNCA vender, transferir, ni licenciar tu información personal o contenido íntimo a terceros o data brokers.</li>
            <li><strong>Protección contra Inteligencia Artificial:</strong> Tu contenido JAMÁS será utilizado ni cedido para entrenar modelos de Inteligencia Artificial.</li>
          </ul>

          <h3 className="text-pink-400 font-bold mt-6 mb-2">2. Cumplimiento con la Legislación Chilena (Ley 19.628)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Derechos ARCO:</strong> Tienes derecho a exigir el Acceso, Rectificación, Cancelación y Oposición del uso de tus datos.</li>
            <li><strong>Derecho al Olvido:</strong> Al eliminar una imagen o tu cuenta, el contenido se elimina definitivamente de todos los servidores (incluyendo Cloudflare y Google Cloud), sin dejar copias ocultas.</li>
          </ul>

          <h3 className="text-pink-400 font-bold mt-6 mb-2">3. Planes, Pagos y Retención (MUY IMPORTANTE)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>El almacenamiento gratuito está limitado estrictamente a <strong>100 MB</strong>.</li>
            <li><strong>Si dejas de pagar tu plan Premium:</strong> Mantendremos todo tu contenido intacto por un período de gracia máximo de <strong>3 meses</strong>.</li>
            <li>Durante el segundo y tercer mes, te enviaremos notificaciones por correo electrónico avisándote de la situación.</li>
            <li>Una vez cumplido el plazo de 3 meses sin regularizar el pago, tu cuenta retornará automáticamente al plan "Gratis". En ese momento, el sistema <strong>eliminará permanentemente</strong> todo el excedente de tus datos (fotos, videos, audios) para ajustarse nuevamente al límite de los 100 MB gratuitos. Asegúrate de descargar tu contenido o renovar tu plan antes de que acabe el plazo.</li>
          </ul>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-colors">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
