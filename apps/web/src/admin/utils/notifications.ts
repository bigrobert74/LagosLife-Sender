// Web Audio API Synthesizer - 100% offline, zero network requests, zero audio file dependencies
export function playOrderAlertChime(isUrgent = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (isUrgent) {
      // Urgent payment alert chime: distinct alert fan-fare (2 fast high beeps then rising chord)
      const freqs = [880, 1046.5, 1318.5, 1760];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0.35, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.35);
      });
    } else {
      // Cheerful cash register chime chord (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    }

    // Trigger mobile haptic vibration if supported (Android / iOS web)
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(isUrgent ? [200, 100, 200, 100, 300] : [150, 80, 150]);
    }
  } catch (err) {
    console.warn('Audio chime playback suppressed or not supported:', err);
  }
}

// Request and dispatch Native System Notification
export async function triggerSystemNotification(title: string, body: string, onClick?: () => void) {
  try {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: true, // We play our custom synthesized rich chime via Web Audio
      });
      if (onClick) {
        n.onclick = () => {
          window.focus();
          onClick();
          n.close();
        };
      }
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const n = new Notification(title, { body, icon: '/favicon.ico', silent: true });
        if (onClick) {
          n.onclick = () => {
            window.focus();
            onClick();
            n.close();
          };
        }
      }
    }
  } catch (err) {
    console.warn('System notification error:', err);
  }
}
