import React, { useState } from 'react';
import CanvasGallery from '@/components/ui/canvas-gallery';
import InfiniteGallery from '@/components/ui/infinite-gallery-tw';

const images = [
  { src: '/fotos/Imagenes-amor/1000043105.jpg', title: 'Amor 1' },
  { src: '/fotos/Imagenes-amor/1000046753.jpg', title: 'Amor 2' },
  { src: '/fotos/Imagenes-amor/1000046754.jpg', title: 'Amor 3' },
  { src: '/fotos/Imagenes-amor/1000046762.jpg', title: 'Amor 4' },
  { src: '/fotos/Imagenes-amor/1759337817954.jpg', title: 'Amor 5' },
  { src: '/fotos/Imagenes-amor/7297f1c0d24917110d23963adf0da967.jpg', title: 'Amor 6' },
  { src: '/fotos/Imagenes-amor/Foto0144.jpg', title: 'Amor 7' },
  { src: '/fotos/Imagenes-amor/IMG-20211014-WA0001.jpg', title: 'Amor 8' },
  { src: '/fotos/Imagenes-amor/IMG-20221028-WA0035.jpg', title: 'Amor 9' },
  { src: '/fotos/Imagenes-amor/IMG-20230628-WA0064.jpg', title: 'Amor 10' },
  { src: '/fotos/Imagenes-amor/IMG-20240126-WA0002~3.jpg', title: 'Amor 11' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0018.jpg', title: 'Amor 12' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0028.jpg', title: 'Amor 13' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0050.jpg', title: 'Amor 14' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0065.jpg', title: 'Amor 15' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0094.jpg', title: 'Amor 16' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0100.jpg', title: 'Amor 17' },
  { src: '/fotos/Imagenes-amor/IMG-20240521-WA0103.jpg', title: 'Amor 18' },
  { src: '/fotos/Imagenes-amor/IMG-20240705-WA0067.jpg', title: 'Amor 19' },
  { src: '/fotos/Imagenes-amor/IMG-20240731-WA0007.jpg', title: 'Amor 20' },
  { src: '/fotos/Imagenes-amor/IMG-20240906-WA0001.jpg', title: 'Amor 21' },
  { src: '/fotos/Imagenes-amor/IMG-20250306-WA0050.jpg', title: 'Amor 22' },
  { src: '/fotos/Imagenes-amor/IMG-20250306-WA0067.jpg', title: 'Amor 23' },
  { src: '/fotos/Imagenes-amor/IMG-20250312-WA0015.jpg', title: 'Amor 24' },
  { src: '/fotos/Imagenes-amor/IMG_20220525_112804_946.jpg', title: 'Amor 25' },
  { src: '/fotos/Imagenes-amor/IMG_20220810_173718.jpg', title: 'Amor 26' },
  { src: '/fotos/Imagenes-amor/IMG_20220810_173741.jpg', title: 'Amor 27' },
  { src: '/fotos/Imagenes-amor/IMG_20220831_081917_104.jpg', title: 'Amor 28' },
  { src: '/fotos/Imagenes-amor/IMG_20220913_140824.jpg', title: 'Amor 29' },
  { src: '/fotos/Imagenes-amor/IMG_20221008_093043.jpg', title: 'Amor 30' },
  { src: '/fotos/Imagenes-amor/IMG_20221008_115919.jpg', title: 'Amor 31' },
  { src: '/fotos/Imagenes-amor/IMG_20221109_222313_405.jpg', title: 'Amor 32' },
  { src: '/fotos/Imagenes-amor/IMG_20221203_143747_971.jpg', title: 'Amor 33' },
  { src: '/fotos/Imagenes-amor/IMG_20230104_205354_801.jpg', title: 'Amor 34' },
  { src: '/fotos/Imagenes-amor/IMG_20230121_184407_392.jpg', title: 'Amor 35' },
  { src: '/fotos/Imagenes-amor/IMG_20230131_220451_862.jpg', title: 'Amor 36' },
  { src: '/fotos/Imagenes-amor/IMG_20230329_182657_681.jpg', title: 'Amor 37' },
  { src: '/fotos/Imagenes-amor/IMG_20230329_184446.jpg', title: 'Amor 38' },
  { src: '/fotos/Imagenes-amor/IMG_20231202_201745.jpg', title: 'Amor 39' },
  { src: '/fotos/Imagenes-amor/IMG_20231202_201844.jpg', title: 'Amor 40' },
  { src: '/fotos/Imagenes-amor/IMG_20231202_201856.jpg', title: 'Amor 41' },
  { src: '/fotos/Imagenes-amor/IMG_20231203_162826.jpg', title: 'Amor 42' },
  { src: '/fotos/Imagenes-amor/IMG_20240304_184938~2.jpg', title: 'Amor 43' },
  { src: '/fotos/Imagenes-amor/IMG_20240827_172950.jpg', title: 'Amor 44' },
  { src: '/fotos/Imagenes-amor/IMG_20241001_191820.jpg', title: 'Amor 45' },
  { src: '/fotos/Imagenes-amor/IMG_20241007_214508.jpg', title: 'Amor 46' },
  { src: '/fotos/Imagenes-amor/IMG_20241125_213128.jpg', title: 'Amor 47' },
  { src: '/fotos/Imagenes-amor/IMG_20241203_230756.jpg', title: 'Amor 48' },
  { src: '/fotos/Imagenes-amor/IMG_20241203_230802.jpg', title: 'Amor 49' },
  { src: '/fotos/Imagenes-amor/IMG_20250117_211901.jpg', title: 'Amor 50' },
  { src: '/fotos/Imagenes-amor/IMG_20250327112511468.jpg', title: 'Amor 51' },
  { src: '/fotos/Imagenes-amor/IMG_20250421_182432.jpg', title: 'Amor 52' },
  { src: '/fotos/Imagenes-amor/IMG_20250428_130924.jpg', title: 'Amor 53' },
  { src: '/fotos/Imagenes-amor/IMG_20250428_131034.jpg', title: 'Amor 54' },
  { src: '/fotos/Imagenes-amor/IMG_20251002_132911.jpg', title: 'Amor 55' },
  { src: '/fotos/Imagenes-amor/IMG_20260518_002038.jpg', title: 'Amor 56' },
  { src: '/fotos/Imagenes-amor/IMG_20260819_204656.jpg', title: 'Amor 57' },
  { src: '/fotos/Imagenes-amor/NESECITO BSUCAR DE ESAS.jpg', title: 'Amor 58' },
  { src: '/fotos/Imagenes-amor/Screenshot_20220711-234736.png', title: 'Amor 59' },
  { src: '/fotos/Imagenes-amor/Screenshot_2023-08-17-19-09-10-468_com.discord.jpg', title: 'Amor 60' },
  { src: '/fotos/Imagenes-amor/Screenshot_2023-08-17-19-12-13-574_com.discord.jpg', title: 'Amor 61' },
  { src: '/fotos/Imagenes-amor/Snapchat-1385529188.jpg', title: 'Amor 62' },
  { src: '/fotos/Imagenes-amor/Snapchat-1521522494.jpg', title: 'Amor 63' },
  { src: '/fotos/Imagenes-amor/VID_20240906_202630.mp4', title: 'Amor 64', isVideo: true },
  { src: '/fotos/Imagenes-amor/WIN_20250817_21_06_20_Pro.jpg', title: 'Amor 65' },
  { src: '/fotos/Imagenes-amor/aura.jpg', title: 'Amor 66' },
  { src: '/fotos/Imagenes-amor/b9bc2a4257e373cf1d8822c7a033b453.jpg', title: 'Amor 67' }
];

function App() {
  const [viewMode, setViewMode] = useState('3d'); // '3d' o 'rows'

  const toggleView = () => {
    setViewMode(prev => prev === '3d' ? 'rows' : '3d');
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-pink-900 to-black text-white">
      {viewMode === '3d' ? (
        <CanvasGallery items={images} toggleView={toggleView} />
      ) : (
        <InfiniteGallery items={images} toggleView={toggleView} />
      )}
    </div>
  );
}

export default App;
