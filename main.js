// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEFA);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(180, 150, -1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// → Ahora casillas se llenará dinámicamente tras cargar el tablero
let casillas = [];

// Mapa de escaleras y serpientes (0-based index)
const snakesAndLadders = {
  3: 22,
  5: 8,
  17: 4,
  // …añade el resto según tu diseño…
};

let numJugadores = 1;
let jugador1Cargado = false;
let jugador2Cargado = false;
let dadoModel = null;
let isRolling = false;
let turnoActual = 1;

let posiciones = { 1: 0, 2: 0 };
let jugadores = { 1: null, 2: null };

// === Botón de inicio ===
document.getElementById('start-button').addEventListener('click', () => {
  numJugadores = parseInt(document.getElementById('player-count').value);
  document.getElementById('start-menu').style.display = 'none';
  document.getElementById('dice-ui').style.display = 'block';
  document.getElementById('turn-indicator').style.display = 'block';
  document.getElementById('turn-indicator').textContent = `Turno: Jugador ${turnoActual}`;
  cargarJugadores();
});

// === Carga de jugadores ===
function cargarJugadores() {
  if (!jugador1Cargado) {
    new MTLLoader().setPath('/src/Jugador1/').load('Jugador1R.mtl', materials => {
      materials.preload();
      new OBJLoader().setMaterials(materials).setPath('/src/Jugador1/').load('Jugador1R.obj', obj => {
        obj.scale.set(10,10,10);
        obj.position.set(casillas[0].x, 10, casillas[0].z);
        scene.add(obj);
        jugadores[1] = obj;
        jugador1Cargado = true;
      });
    });
  }
  if (numJugadores === 2 && !jugador2Cargado) {
    new MTLLoader().setPath('/src/Jugador2/').load('Jugador2B.mtl', materials => {
      materials.preload();
      new OBJLoader().setMaterials(materials).setPath('/src/Jugador2/').load('Jugador2B.obj', obj => {
        obj.scale.set(10,10,10);
        obj.position.set(casillas[0].x + 5, 10, casillas[0].z);
        scene.add(obj);
        jugadores[2] = obj;
        jugador2Cargado = true;
      });
    });
  }
}

// === Cargar modelo Dado ===
new MTLLoader().setPath('/src/Dado/').load('Dado.mtl', materials => {
  materials.preload();
  new OBJLoader().setMaterials(materials).setPath('/src/Dado/').load('Dado.obj', obj => {
    obj.scale.set(10,10,10);
    obj.position.set(50, 20, 70);
    scene.add(obj);
    dadoModel = obj;
  });
});

// === Cargar modelo Tablero y generar casillas ===
new MTLLoader().setPath('/src/Tablero/').load('Tablero.mtl', materials => {
  materials.preload();
  new OBJLoader().setMaterials(materials).setPath('/src/Tablero/').load('Tablero.obj', board => {
    board.scale.set(10,10,10);
    board.position.set(0, -1, 0);
    scene.add(board);
    generateCasillas(board);
  });
});

// === Función para generar automáticamente las 100 casillas ===
function generateCasillas(boardMesh) {
  const bbox = new THREE.Box3().setFromObject(boardMesh);
  const min = bbox.min, max = bbox.max;
  const width = max.x - min.x;
  const depth = max.z - min.z;
  const cellW = width / 10;
  const cellD = depth / 10;

  casillas = [];
  for (let fila = 0; fila < 10; fila++) {
    for (let col = 0; col < 10; col++) {
      // en zig-zag:
      const j = (fila % 2 === 0) ? col : (9 - col);
      const x = min.x + j * cellW + cellW / 2;
      const z = min.z + fila * cellD + cellD / 2;
      casillas.push({ x, z });
    }
  }
}

// === Evento Tirar Dado ===
document.getElementById('roll-button').addEventListener('click', () => {
  if (!dadoModel || isRolling || casillas.length !== 100) return;  // espera a que casillas esté listo
  isRolling = true;
  const resultado = Math.floor(Math.random() * 6) + 1;
  document.getElementById('dice-result').textContent = `Resultado: ${resultado}`;

  const orient = {
    1: { x: 0, y: 0 },
    2: { x: Math.PI/2, y: 0 },
    3: { x: 0, y: Math.PI/2 },
    4: { x: 0, y: -Math.PI/2 },
    5: { x: -Math.PI/2, y: 0 },
    6: { x: Math.PI, y: 0 },
  };
  const destino = orient[resultado];
  const giros = 4 * Math.PI;
  const inicio = { x: dadoModel.rotation.x, y: dadoModel.rotation.y };
  const dur = 1000;
  const t0 = performance.now();

  function rotarPaso(t) {
    const u = Math.min((t - t0) / dur, 1);
    if (u >= 1) {
      dadoModel.rotation.x = destino.x;
      dadoModel.rotation.y = destino.y;
      // una vez gira el dado, movemos al jugador paso a paso:
      const jugador = jugadores[turnoActual];
      const idx0 = posiciones[turnoActual];
      moverPasoAPaso(jugador, idx0, resultado, () => {
        let idx1 = Math.min(idx0 + resultado, 99);
        // comprueba serpiente o escalera
        if (snakesAndLadders[idx1] !== undefined) {
          const idx2 = snakesAndLadders[idx1];
          posiciones[turnoActual] = idx2;
          animarMovimientoJugador(jugador, casillas[idx2], 500, finalizarTurno);
        } else {
          posiciones[turnoActual] = idx1;
          finalizarTurno();
        }
      });
      return;
    }
    // animación intermedia
    dadoModel.rotation.x = inicio.x + giros*(1 - Math.cos(Math.PI*u)) + (destino.x - inicio.x)*u;
    dadoModel.rotation.y = inicio.y + giros*(1 - Math.cos(Math.PI*u)) + (destino.y - inicio.y)*u;
    requestAnimationFrame(rotarPaso);
  }
  requestAnimationFrame(rotarPaso);
});

// === Animación con callback ===
function animarMovimientoJugador(jugador, destino, duracion = 500, onComplete) {
  const sx = jugador.position.x, sz = jugador.position.z, t0 = performance.now();
  function paso(t) {
    const u = Math.min((t - t0) / duracion, 1);
    jugador.position.x = sx + (destino.x - sx)*u;
    jugador.position.z = sz + (destino.z - sz)*u;
    if (u < 1) requestAnimationFrame(paso);
    else if (typeof onComplete === 'function') onComplete();
  }
  requestAnimationFrame(paso);
}

// === Movimiento casilla a casilla ===
function moverPasoAPaso(jugador, idx, pasos, onFinished) {
  if (pasos <= 0) { onFinished(); return; }
  const next = Math.min(idx + 1, casillas.length - 1);
  animarMovimientoJugador(jugador, casillas[next], 300, () => {
    moverPasoAPaso(jugador, next, pasos - 1, onFinished);
  });
}

// === Finalizar turno ===
function finalizarTurno() {
  isRolling = false;
  if (numJugadores === 2) {
    turnoActual = turnoActual === 1 ? 2 : 1;
    document.getElementById('turn-indicator').textContent = `Turno: Jugador ${turnoActual}`;
  }
}

// === Render Loop ===
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
