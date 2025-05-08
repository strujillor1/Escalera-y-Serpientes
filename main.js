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

let numJugadores = 1;
let jugador1Cargado = false;
let jugador2Cargado = false;
let dadoModel = null;
let isRolling = false;
let turnoActual = 1;

let posiciones = {
  1: 0,
  2: 0
};

let jugadores = {
  1: null,
  2: null
};

const tamanoCasilla = 10;
const casillas = [];
const size = tamanoCasilla;
const origenX = 60;
const origenZ = 65;
for (let fila = 0; fila < 10; fila++) {
  for (let col = 0; col < 10; col++) {
    const x = origenX + (fila % 2 === 0 ? col : 9 - col) * size;
    const z = origenZ + fila * size;
    casillas.push({ x, z });
  }
}

// === Botón de inicio ===
document.getElementById('start-button').addEventListener('click', () => {
  const seleccion = document.getElementById('player-count').value;
  numJugadores = parseInt(seleccion);

  document.getElementById('start-menu').style.display = 'none';
  document.getElementById('dice-ui').style.display = 'block';
  document.getElementById('turn-indicator').style.display = 'block';
  document.getElementById('turn-indicator').textContent = `Turno: Jugador ${turnoActual}`;

  cargarJugadores();
});

function cargarJugadores() {
  if (!jugador1Cargado) {
    const jugador1MtlLoader = new MTLLoader();
    jugador1MtlLoader.setPath('/src/Jugador1/');
    jugador1MtlLoader.load('Jugador1R.mtl', (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath('/src/Jugador1/');
      objLoader.load('Jugador1R.obj', (object) => {
        object.scale.set(10, 10, 10);
        object.position.set(casillas[0].x, 10, casillas[0].z);
        scene.add(object);
        jugador1Cargado = true;
        jugadores[1] = object;
        console.log("✅ Jugador 1 cargado");
      });
    });
  }

  if (numJugadores === 2 && !jugador2Cargado) {
    const jugador2MtlLoader = new MTLLoader();
    jugador2MtlLoader.setPath('/src/Jugador2/');
    jugador2MtlLoader.load('Jugador2B.mtl', (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath('/src/Jugador2/');
      objLoader.load('Jugador2B.obj', (object) => {
        object.scale.set(10, 10, 10);
        object.position.set(casillas[0].x + 5, 10, casillas[0].z); // ligeramente a la derecha
        scene.add(object);
        jugador2Cargado = true;
        jugadores[2] = object;
        console.log("✅ Jugador 2 cargado");
      });
    });
  }
}

// === Cargar modelo Dado ===
const dadoMtlLoader = new MTLLoader();
dadoMtlLoader.setPath('/src/Dado/');
dadoMtlLoader.load('Dado.mtl', (materials) => {
  materials.preload();
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.setPath('/src/Dado/');
  objLoader.load('Dado.obj', (object) => {
    object.scale.set(10, 10, 10);
    object.position.set(50, 20, 70);
    object.rotation.set(0, 0, 0);
    scene.add(object);
    dadoModel = object;
    console.log("✅ Dado cargado");
  }, undefined, (err) => console.error("❌ Error cargando Dado.obj:", err));
}, undefined, (err) => console.error("❌ Error cargando Dado.mtl:", err));

// === Cargar modelo Tablero ===
const tableroMtlLoader = new MTLLoader();
tableroMtlLoader.setPath('/src/Tablero/');
tableroMtlLoader.load('Tablero.mtl', (materials) => {
  materials.preload();
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.setPath('/src/Tablero/');
  objLoader.load('Tablero.obj', (object) => {
    object.scale.set(10, 10, 10);
    object.position.set(0, -1, 0);
    scene.add(object);
    console.log("✅ Tablero cargado");
  }, undefined, (err) => console.error("❌ Error cargando Tablero.obj:", err));
}, undefined, (err) => console.error("❌ Error cargando Tablero.mtl:", err));

// === Botón "Tirar Dado" ===
document.getElementById('roll-button').addEventListener('click', () => {
  if (!dadoModel || isRolling) return;

  isRolling = true;
  const resultado = Math.floor(Math.random() * 6) + 1;
  console.log("🎲 Resultado:", resultado);

  document.getElementById('dice-result').textContent = `Resultado: ${resultado}`;

  const orientaciones = {
    1: { x: 0, y: 0 },
    2: { x: Math.PI / 2, y: 0 },
    3: { x: 0, y: Math.PI / 2 },
    4: { x: 0, y: -Math.PI / 2 },
    5: { x: -Math.PI / 2, y: 0 },
    6: { x: Math.PI, y: 0 },
  };

  const destino = orientaciones[resultado];
  const giros = 4 * Math.PI;
  const inicio = {
    x: dadoModel.rotation.x,
    y: dadoModel.rotation.y,
  };

  const duracion = 1000;
  const inicioTiempo = performance.now();

  function rotarPaso(tiempoActual) {
    const t = Math.min((tiempoActual - inicioTiempo) / duracion, 1);
    if (t >= 1) {
      dadoModel.rotation.x = destino.x;
      dadoModel.rotation.y = destino.y;
      isRolling = false;

      posiciones[turnoActual] += resultado;
      posiciones[turnoActual] = Math.min(posiciones[turnoActual], 99);
      const jugador = jugadores[turnoActual];
      if (jugador) {
        const destino = casillas[posiciones[turnoActual]];
        animarMovimientoJugador(jugador, destino);
      }

      if (numJugadores === 2) {
        turnoActual = turnoActual === 1 ? 2 : 1;
        document.getElementById('turn-indicator').textContent = `Turno: Jugador ${turnoActual}`;
      }
      return;
    }

    dadoModel.rotation.x = inicio.x + giros * (1 - Math.cos(Math.PI * t)) + (destino.x - inicio.x) * t;
    dadoModel.rotation.y = inicio.y + giros * (1 - Math.cos(Math.PI * t)) + (destino.y - inicio.y) * t;

    requestAnimationFrame(rotarPaso);
  }

  requestAnimationFrame(rotarPaso);
});

function animarMovimientoJugador(jugador, destino, duracion = 500) {
  const inicioX = jugador.position.x;
  const inicioZ = jugador.position.z;
  const inicioTiempo = performance.now();

  function paso(tiempoActual) {
    const t = Math.min((tiempoActual - inicioTiempo) / duracion, 1);
    jugador.position.x = inicioX + (destino.x - inicioX) * t;
    jugador.position.z = inicioZ + (destino.z - inicioZ) * t;

    if (t < 1) {
      requestAnimationFrame(paso);
    }
  }

  requestAnimationFrame(paso);
}

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
