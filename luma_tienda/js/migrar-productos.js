// js/migrar-productos.js
// ⚠️ ESTE ARCHIVO SOLO SE EJECUTA UNA VEZ PARA MIGRAR PRODUCTOS A FIRESTORE
// Después de ejecutarlo, puedes eliminarlo o comentarlo

import { subirProductosFirestore } from './firebase-products.js';

const productosBase = [
    { ID: 1, NOMBRE: "SERENA", COLOR: "marfil", COLORNOMBRE: "MARFIL", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: true, IMAGEN: "https://i.postimg.cc/FstjVW0J/image_(1).png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 2, NOMBRE: "SERENA", COLOR: "negro", COLORNOMBRE: "NEGRO", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: false, IMAGEN: "https://i.postimg.cc/4NCzQLpc/Chat_GPT_Image_10_abr_2026_02_11_44_p_m.png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 3, NOMBRE: "SERENA", COLOR: "cocoa", COLORNOMBRE: "COCOA", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: true, IMAGEN: "https://i.postimg.cc/brh1qvsb/Black-Bodysuit-Model.png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 4, NOMBRE: "SERENA", COLOR: "beige", COLORNOMBRE: "BEIGE", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: false, IMAGEN: "https://i.postimg.cc/Wzv0s4hZ/Beige-Bodysuit-Model.png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 5, NOMBRE: "ALMA", COLOR: "marfil", COLORNOMBRE: "MARFIL", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: false, IMAGEN: "https://i.postimg.cc/zX39TfSy/Chat_GPT_Image_11_abr_2026_04_14_45_p_m.png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 6, NOMBRE: "ALMA", COLOR: "negro", COLORNOMBRE: "NEGRO", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: true, IMAGEN: "https://i.postimg.cc/xTqWLdy8/Chat_GPT_Image_11_abr_2026_04_13_55_p_m.png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 7, NOMBRE: "ALMA", COLOR: "cocoa", COLORNOMBRE: "COCOA", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: false, IMAGEN: "https://i.postimg.cc/59Bwn8RC/Black-Bodysuit-Model-(1).png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" },
    { ID: 8, NOMBRE: "ALMA", COLOR: "beige", COLORNOMBRE: "BEIGE", TALLAS: ["S/M","L/XL"], PRECIO: 89900, PRECIOOFERTA: 44990, DESTACADO: true, IMAGEN: "https://i.postimg.cc/ncM6qLYL/Chat_GPT_Image_11_abr_2026_04_14_30_p_m.png", IMAGENES: [], DESCRIPCION: "Prenda confeccionada con materiales de alta calidad", CATEGORIA: "BODY" }
];

// Exportar los productos base por si se necesitan
export { productosBase };

// Función para ejecutar la migración (llamar desde consola)
export async function ejecutarMigracion() {
    console.log("🚀 Iniciando migración de productos a Firestore...");
    const resultado = await subirProductosFirestore(productosBase);
    if (resultado) {
        console.log("✅ Migración completada exitosamente");
    } else {
        console.log("❌ Error durante la migración");
    }
    return resultado;
}