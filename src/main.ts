const mode = new URLSearchParams(location.search).get('mode') ?? 'autopilot';

if (mode === 'capture') void import('./modes/capture');
else if (mode === 'loop') void import('./modes/loop');
else void import('./modes/autopilot');
