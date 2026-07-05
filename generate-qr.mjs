import QRCode from 'qrcode';
import fs from 'fs';

const URL = 'https://biblio-pearl.vercel.app/';

// Générer le QR code en PNG haute qualité
await QRCode.toFile('bibliotech-qrcode.png', URL, {
  type: 'png',
  width: 800,
  margin: 2,
  color: {
    dark: '#1B7A3D',   // Vert BiblioTech
    light: '#FFFFFF',
  },
  errorCorrectionLevel: 'H', // Haute correction d'erreur
});

console.log('✅ QR code généré : bibliotech-qrcode.png');
console.log('📱 URL encodée :', URL);
