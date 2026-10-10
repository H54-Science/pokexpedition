// Catch module loading/parsing errors before main.js can install its own handler.
// A versioned entry point also avoids reusing a broken cached module after deployment.
const message = document.querySelector('#loading small');
try {
  await import('./main.js?v=loading-fix-1');
} catch (error) {
  console.error('Démarrage impossible :', error);
  if (message) message.textContent = `Impossible de démarrer : ${error.message}`;
  const retry = document.createElement('button');
  retry.className = 'load-retry';
  retry.textContent = 'Réessayer';
  retry.addEventListener('click', () => location.reload());
  document.querySelector('#loading > div')?.append(retry);
}
