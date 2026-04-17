// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    FacebookAuthProvider, 
    setPersistence, 
    browserLocalPersistence,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAlsxSI3LTHn-lDKHimdRPht9oCyGARllY",
    authDomain: "luma-textiles.firebaseapp.com",
    projectId: "luma-textiles",
    storageBucket: "luma-textiles.firebasestorage.app",
    messagingSenderId: "366206847606",
    appId: "1:366206847606:web:651b2a34b40321f05a6d57",
    measurementId: "G-6NKZVLGFGD"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistencia
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Proveedores de autenticación
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Exportar todo
export { 
    auth, 
    db, 
    googleProvider, 
    facebookProvider,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};