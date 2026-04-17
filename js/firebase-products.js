// js/firebase-products.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PRODUCTOS_COLLECTION = "productos";

// Cargar todos los productos desde Firestore
export async function cargarProductosFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, PRODUCTOS_COLLECTION));
        const productos = [];
        querySnapshot.forEach((doc) => {
            productos.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ ${productos.length} productos cargados desde Firestore`);
        return productos;
    } catch (error) {
        console.error("❌ Error cargando productos desde Firestore:", error);
        return [];
    }
}

// Guardar un producto en Firestore
export async function guardarProductoFirestore(producto) {
    try {
        const docRef = await addDoc(collection(db, PRODUCTOS_COLLECTION), producto);
        console.log("✅ Producto guardado con ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error guardando producto:", error);
        return null;
    }
}

// Subir múltiples productos a Firestore (para migración inicial)
export async function subirProductosFirestore(productos) {
    try {
        for (const producto of productos) {
            await addDoc(collection(db, PRODUCTOS_COLLECTION), producto);
        }
        console.log(`✅ ${productos.length} productos subidos a Firestore`);
        return true;
    } catch (error) {
        console.error("❌ Error subiendo productos:", error);
        return false;
    }
}