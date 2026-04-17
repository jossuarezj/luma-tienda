// js/products.js - VERSIÓN CON FIRESTORE (FORZADA)
import { cargarProductosFirestore } from './firebase-products.js';

// Exportar productos (se cargarán desde Firestore)
export let productos = [];

// Colores fijos
export const colores = [
    { nombre: "Todos", valor: "todos" },
    { nombre: "MARFIL", valor: "marfil" },
    { nombre: "NEGRO", valor: "negro" },
    { nombre: "COCOA", valor: "cocoa" },
    { nombre: "BEIGE", valor: "beige" }
];

// Función para normalizar talla a código SKU
function normalizarTalla(talla) {
    if (!talla) return 'UNICO';
    if (talla === 'S/M') return 'SM';
    if (talla === 'L/XL') return 'LXL';
    return talla.replace('/', '').toUpperCase();
}

function normalizarCategoria(categoria) {
    if (!categoria) return 'BODY';
    return categoria.toUpperCase().replace(/\s/g, '');
}

export function generarSKU(categoria, nombre, color, talla) {
    const cat = normalizarCategoria(categoria);
    const ref = nombre ? nombre.toUpperCase() : 'PROD';
    const col = color ? color.toUpperCase() : 'BASE';
    const t = normalizarTalla(talla);
    return `${cat}-${ref}-${col}-${t}`;
}

// Cargar productos SOLO desde Firestore
export async function actualizarProductos() {
    try {
        console.log("📡 Cargando productos desde Firestore...");
        const productosFirestore = await cargarProductosFirestore();
        
        if (productosFirestore && productosFirestore.length > 0) {
            productos.length = 0;
            productos.push(...productosFirestore);
            console.log("✅ Productos cargados desde Firestore:", productos.length);
            return productos;
        } else {
            console.error("❌ No hay productos en Firestore");
            return [];
        }
    } catch (error) {
        console.error("❌ Error cargando productos desde Firestore:", error);
        return [];
    }
}

// Cargar productos al iniciar
actualizarProductos().catch(console.error);