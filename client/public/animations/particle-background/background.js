// Adapted from Demo 5 of 3D Particle Explorations by Jack Rugile / Codrops.
// See UPSTREAM.md for attribution, credits, and the original resource license.
import Calc from './utils/calc.js';
import Ease from './utils/ease.js';
import System from './demo-5/system.js';

const loader = {
  calc: new Calc(),
  ease: new Ease(),
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(100, 1, 0.0001, 10000),
  cameraBaseY: 0,
  cameraBaseZ: 30,
  deltaTimeNormal: 1,
  elapsedMilliseconds: 0,
  isGrid: false,
  isOrbit: false,
};

// Leave the CSS gradient visible on devices without WebGL.
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
} catch {
  // The page remains usable without the decorative canvas.
}

if (renderer) {
  document.body.appendChild(renderer.domElement);
  // Enlarge the particle field so the waves extend beyond the centered form.
  loader.camera.zoom = 2;
  loader.camera.position.z = loader.cameraBaseZ;
  const system = new System(loader);
  let frame;
  let previousTime;

  function resize() {
    loader.camera.aspect = window.innerWidth / window.innerHeight;
    loader.camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate(time) {
    // Clamp long frames and reset the clock on resume to avoid a sudden jump.
    const delta = previousTime === undefined ? 1000 / 60 : Math.min(time - previousTime, 50);
    previousTime = time;
    loader.deltaTimeNormal = delta / (1000 / 60);
    loader.elapsedMilliseconds += delta;
    system.update();
    renderer.render(loader.scene, loader.camera);
    frame = requestAnimationFrame(animate);
  }

  function syncVisibility() {
    cancelAnimationFrame(frame);
    previousTime = undefined;
    if (!document.hidden) frame = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', syncVisibility);
    loader.scene.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    system.sphereGeometry.dispose();
    system.boxGeometry.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  });
  resize();
  syncVisibility();
}
