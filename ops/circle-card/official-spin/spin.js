const experience = document.querySelector('.experience');
const intro = document.querySelector('.intro');
const coinButton = document.querySelector('.coin-button');
const coin = document.querySelector('.coin');
const reveal = document.querySelector('.reveal');
const heading = document.querySelector('#official-card-heading');
const replay = document.querySelector('.replay');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let gesture;

async function spin(direction = 'right') {
  if (experience.dataset.phase !== 'intro') return;

  experience.dataset.direction = direction;
  experience.dataset.phase = 'spinning';
  coinButton.setAttribute('aria-disabled', 'true');

  if (!reducedMotion.matches && typeof coin.getAnimations === 'function') {
    await Promise.allSettled(coin.getAnimations().map((animation) => animation.finished));
  }

  const moveFocus = intro.contains(document.activeElement) || document.activeElement === document.body;
  intro.hidden = true;
  reveal.hidden = false;
  experience.dataset.phase = 'revealed';
  if (moveFocus) heading.focus({ preventScroll: true });
}

coinButton.addEventListener('click', () => spin());

coinButton.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || experience.dataset.phase !== 'intro') return;

  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  coinButton.setPointerCapture(event.pointerId);
});

coinButton.addEventListener('pointerup', (event) => {
  if (gesture?.id !== event.pointerId) return;

  const horizontalDistance = event.clientX - gesture.x;
  const verticalDistance = event.clientY - gesture.y;
  gesture = undefined;

  if (Math.abs(horizontalDistance) >= 32 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
    spin(horizontalDistance < 0 ? 'left' : 'right');
  }
});

coinButton.addEventListener('lostpointercapture', () => {
  gesture = undefined;
});

replay.addEventListener('click', () => {
  experience.dataset.phase = 'intro';
  coinButton.removeAttribute('aria-disabled');
  reveal.hidden = true;
  intro.hidden = false;
  coinButton.focus({ preventScroll: true });
});

document.querySelector('.coin-fallback').hidden = true;
document.querySelector('.instruction').hidden = false;
coinButton.hidden = false;
