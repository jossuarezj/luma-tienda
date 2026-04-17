// js/firebase-ventas.js
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const VENTAS_COLLECTION = "ventas";

// Guardar una venta en Firestore
export async function guardarVentaFirestore(venta) {
    try {
        const docRef = await addDoc(collection(db, VENTAS_COLLECTION), {
            ...venta,
            fecha: new Date().toISOString(),
            fechaCreacion: new Date()
        });
        console.log("✅ Venta guardada en Firestore con ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error guardando venta:", error);
        return null;
    }
}

// Cargar todas las ventas desde Firestore
export async function cargarVentasFirestore() {
    try {
        const q = query(collection(db, VENTAS_COLLECTION), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);
        const ventas = [];
        querySnapshot.forEach((doc) => {
            ventas.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ ${ventas.length} ventas cargadas desde Firestore`);
        return ventas;
    } catch (error) {
        console.error("❌ Error cargando ventas:", error);
        return [];
    }
}

// Actualizar estado de una venta
export async function actualizarVentaFirestore(id, datos) {
    try {
        await updateDoc(doc(db, VENTAS_COLLECTION, id), datos);
        console.log("✅ Venta actualizada:", id);
        return true;
    } catch (error) {
        console.error("❌ Error actualizando venta:", error);
        return false;
    }
}

// Eliminar una venta
export async function eliminarVentaFirestore(id) {
    try {
        await deleteDoc(doc(db, VENTAS_COLLECTION, id));
        console.log("✅ Venta eliminada:", id);
        return true;
    } catch (error) {
        console.error("❌ Error eliminando venta:", error);
        return false;
    }
}