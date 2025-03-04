import * as THREE from "https://cdn.skypack.dev/three@0.129.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GUI } from "https://cdn.skypack.dev/dat.gui";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDbu715Pb04cLqKz9QKEg9bS5jWsKRRfpU",
    authDomain: "solarsystem-a9d24.firebaseapp.com",
    projectId: "solarsystem-a9d24",
    storageBucket: "solarsystem-a9d24.firebasestorage.app",
    messagingSenderId: "383716181804",
    appId: "1:383716181804:web:89e0bf2643857acf148e89",
    measurementId: "G-JX15KTF55Z"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let scene, camera, renderer, controls, gui;
let planets = {};
let orbitRadii = {
    mercury: 50,
    venus: 60,
    earth: 70,
    mars: 80,
    jupiter: 100,
    saturn: 120,
    uranus: 140,
    neptune: 160
};
let revolutionSpeeds = {
    mercury: 4,
    venus: 3,
    earth: 2,
    mars: 1.8,
    jupiter: 1.2,
    saturn: 1,
    uranus: 0.7,
    neptune: 0.5
};
let planetSizes = {
    sun: 20,
    mercury: 2,
    venus: 3,
    earth: 4,
    mars: 3.5,
    jupiter: 10,
    saturn: 8,
    uranus: 6,
    neptune: 5
};

function loadPlanetTexture(texture, radius) {
    const geometry = new THREE.SphereGeometry(radius, 100, 100);
    const planetTexture = new THREE.TextureLoader().load(texture);
    const material = new THREE.MeshBasicMaterial({ map: planetTexture });
    return new THREE.Mesh(geometry, material);
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 15000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    planets.sun = loadPlanetTexture("../img/sun_hd.jpg", planetSizes.sun);
    scene.add(planets.sun);
    
    Object.keys(orbitRadii).forEach(planet => {
        planets[planet] = loadPlanetTexture(`../img/${planet}_hd.jpg`, planetSizes[planet]);
        scene.add(planets[planet]);
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 12;
    controls.maxDistance = 600;
    camera.position.z = 100;

    createOrbits();
    setupGUI();
    setupFirebaseButtons();
}

function createOrbits() {
    Object.values(orbitRadii).forEach(radius => {
        const geometry = new THREE.RingGeometry(radius - 0.1, radius, 100);
        const material = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
    });
}

function planetRevolver(time, speed, planet, orbitRadius) {
    let orbitSpeedMultiplier = 0.001;
    const planetAngle = time * orbitSpeedMultiplier * speed;
    planets[planet].position.x = planets.sun.position.x + orbitRadius * Math.cos(planetAngle);
    planets[planet].position.z = planets.sun.position.z + orbitRadius * Math.sin(planetAngle);
}

function animate(time) {
    planets.sun.rotation.y += 0.005;
    Object.keys(orbitRadii).forEach(planet => {
        planetRevolver(time, revolutionSpeeds[planet], planet, orbitRadii[planet]);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function setupGUI() {
    gui = new GUI();
    const speedFolder = gui.addFolder("Revolution Speeds");
    const orbitFolder = gui.addFolder("Orbit Radii");
    const sizeFolder = gui.addFolder("Planet Sizes");

    Object.keys(revolutionSpeeds).forEach(planet => {
        speedFolder.add(revolutionSpeeds, planet, 0.1, 10, 0.1);
        orbitFolder.add(orbitRadii, planet, 40, 200, 1);
        sizeFolder.add(planetSizes, planet, 1, 15, 0.1).onChange(value => {
            planets[planet].geometry = new THREE.SphereGeometry(value, 100, 100);
        });
    });
}

async function saveToFirebase() {
    try {
        await setDoc(doc(db, "solarSystem", "config"), {
            orbitRadii,
            revolutionSpeeds,
            planetSizes
        });
        alert("✅ Data saved to Firebase successfully!");
    } catch (error) {
        console.error("Error saving data:", error);
        alert("❌ Error saving data. Check the console for details.");
    }
}

async function loadFromFirebase() {
    try {
        const docSnap = await getDoc(doc(db, "solarSystem", "config"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            Object.assign(orbitRadii, data.orbitRadii);
            Object.assign(revolutionSpeeds, data.revolutionSpeeds);
            Object.assign(planetSizes, data.planetSizes);
            updateGUIControls();
            alert("✅ Data loaded successfully!");
        } else {
            alert("⚠️ No data found in Firebase.");
        }
    } catch (error) {
        console.error("Error loading data:", error);
        alert("❌ Error loading data. Check the console for details.");
    }
}

function updateGUIControls() {
    Object.keys(revolutionSpeeds).forEach(planet => {
        gui.__folders["Revolution Speeds"].__controllers
            .find(controller => controller.property === planet)
            .setValue(revolutionSpeeds[planet]);

        gui.__folders["Orbit Radii"].__controllers
            .find(controller => controller.property === planet)
            .setValue(orbitRadii[planet]);

        gui.__folders["Planet Sizes"].__controllers
            .find(controller => controller.property === planet)
            .setValue(planetSizes[planet]);
    });

    Object.keys(planetSizes).forEach(planet => {
        planets[planet].geometry = new THREE.SphereGeometry(planetSizes[planet], 100, 100);
    });
}

function setupFirebaseButtons() {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.position = "absolute";
    buttonContainer.style.top = "20px";
    buttonContainer.style.left = "20px";
    buttonContainer.style.zIndex = "1000";
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save to Firebase";
    saveButton.onclick = saveToFirebase;
    saveButton.style.padding = "10px";
    saveButton.style.cursor = "pointer";

    const loadButton = document.createElement("button");
    loadButton.textContent = "Load from Firebase";
    loadButton.onclick = loadFromFirebase;
    loadButton.style.padding = "10px";
    loadButton.style.cursor = "pointer";

    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(loadButton);
    document.body.appendChild(buttonContainer);
}

init();
animate(0);
