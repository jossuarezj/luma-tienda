import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getCurrentUser } from './auth.js';

const VENTAS_COLLECTION = "ventas";

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

export async function cargarVentasFirestore() {
    try {
        const user = getCurrentUser();
        if (!user) return [];
        
        let q;
        if (user.email === "info@lumacolombia.com") {
            // Administrador: ver todas las ventas
            q = query(collection(db, VENTAS_COLLECTION), orderBy("fecha", "desc"));
        } else {
            // Usuario normal: solo sus propias ventas
            q = query(collection(db, VENTAS_COLLECTION), where("email", "==", user.email), orderBy("fecha", "desc"));
        }
        
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