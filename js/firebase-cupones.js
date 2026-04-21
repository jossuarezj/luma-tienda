// js/firebase-cupones.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CUPONES_COLLECTION = "cupones";

// Cargar todos los cupones desde Firestore
export async function cargarCuponesFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, CUPONES_COLLECTION));
        const cupones = [];
        querySnapshot.forEach((doc) => {
            cupones.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ ${cupones.length} cupones cargados desde Firestore`);
        return cupones;
    } catch (error) {
        console.error("❌ Error cargando cupones:", error);
        return [];
    }
}

// Guardar un cupón en Firestore
export async function guardarCuponFirestore(cupon) {
    try {
        const docRef = await addDoc(collection(db, CUPONES_COLLECTION), cupon);
        console.log("✅ Cupón guardado con ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error guardando cupón:", error);
        return null;
    }
}

// Marcar cupón como usado
export async function marcarCuponUsado(codigo, emailUsuario) {
    try {
        const q = query(collection(db, CUPONES_COLLECTION), where("codigo", "==", codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docRef = doc(db, CUPONES_COLLECTION, querySnapshot.docs[0].id);
            await updateDoc(docRef, { 
                usado: true,
                usadoPor: emailUsuario,
                fechaUso: new Date().toISOString()
            });
            console.log("✅ Cupón marcado como usado:", codigo);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error marcando cupón:", error);
        return false;
    }
}

// Eliminar un cupón
export async function eliminarCuponFirestore(id) {
    try {
        await deleteDoc(doc(db, CUPONES_COLLECTION, id));
        console.log("✅ Cupón eliminado:", id);
        return true;
    } catch (error) {
        console.error("❌ Error eliminando cupón:", error);
        return false;
    }
}

// Resetear cupón (marcarlo como no usado)
export async function resetearCuponFirestore(codigo) {
    try {
        const q = query(collection(db, CUPONES_COLLECTION), where("codigo", "==", codigo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docRef = doc(db, CUPONES_COLLECTION, querySnapshot.docs[0].id);
            await updateDoc(docRef, { 
                usado: false,
                usadoPor: null,
                fechaUso: null
            });
            console.log("✅ Cupón reseteado:", codigo);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error reseteando cupón:", error);
        return false;
    }
}