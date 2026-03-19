export const playNotificationSound = () => {
  try {
    // Intenta reproducir un archivo mp3 que el usuario puede colocar en "public/notification.mp3"
    const audio = new Audio('/notification.mp3');
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: Si no existe el archivo mp3 o el navegador bloquea el autoplay por red, usamos Síntesis de Audio Nativa (Beep)
        synthesizeBeep();
      });
    }
  } catch (err) {
    synthesizeBeep();
  }
};

const synthesizeBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Tono de doble campana aguda y agradable (A5 y C#6)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); 
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error("Audio API blocked:", err);
  }
};
