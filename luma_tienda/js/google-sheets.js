// js/google-sheets.js
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9xglr_1x0uyyinnlcYjzAvYa_MU1hdj-zeDqMBkS6Q5XERl6CjgXrvYQxMaEWlup9gJu5UrWp7_ws/pub?output=csv";

export async function cargarProductosDesdeSheet() {
    try {
        console.log("📡 Cargando productos desde Google Sheets...");
        const response = await fetch(GOOGLE_SHEETS_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log("📄 CSV cargado, longitud:", csvText.length);
        
        if (csvText.length < 50) {
            console.warn("⚠️ El CSV parece estar vacío o tener muy pocos datos");
            return null;
        }
        
        // Convertir CSV a JSON
        const lineas = csvText.split('\n');
        const productosSheet = [];
        
        for (let i = 1; i < lineas.length; i++) {
            if (!lineas[i].trim()) continue;
            
            // Manejar comillas en los valores
            const valores = [];
            let enComillas = false;
            let valorActual = '';
            
            for (let char of lineas[i]) {
                if (char === '"') {
                    enComillas = !enComillas;
                } else if (char === ',' && !enComillas) {
                    valores.push(valorActual.trim());
                    valorActual = '';
                } else {
                    valorActual += char;
                }
            }
            valores.push(valorActual.trim());
            
            // AHORA SIN CUELLO - Los índices cambiaron
            if (valores.length >= 7 && valores[0]) {
                const producto = {
                    ID: parseInt(valores[0]) || i,
                    NOMBRE: valores[1] || "Producto",
                    // CUELLO: YA NO EXISTE
                    COLOR: valores[2] || "beige",        // Antes era valores[3]
                    COLORNOMBRE: valores[3] || "BEIGE",  // Antes era valores[4]
                    TALLAS: valores[4] ? valores[4].split(', ') : ["S/M", "L/XL"],  // Antes era valores[5]
                    PRECIO: parseInt(valores[5]) || 89900,  // Antes era valores[6]
                    PRECIOOFERTA: valores[6] ? parseInt(valores[6]) : null,  // Antes era valores[7]
                    IMAGEN: valores[7] || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400",  // Antes era valores[8]
                    IMAGENES: valores[8] ? valores[8].split(', ') : [],  // Antes era valores[9]
                    DESCRIPCION: valores[9] || "Body confeccionado en Tela Jabón.",  // Antes era valores[10]
                    DESTACADO: valores[10] === "SI",  // Antes era valores[11]
                    CATEGORIA: valores[11] || "BODY",  // Antes era valores[12]
                    SKU: valores[12] || null  // Antes era valores[13]
                };
                productosSheet.push(producto);
            }
        }
        
        console.log(`✅ ${productosSheet.length} productos cargados desde Google Sheets`);
        console.log("📋 Primer producto:", productosSheet[0]);
        localStorage.setItem('lumaProductosSheet', JSON.stringify(productosSheet));
        return productosSheet;
    } catch (error) {
        console.error("❌ Error cargando productos desde Google Sheets:", error);
        return null;
    }
}

export function getProductosFromSheet() {
    return JSON.parse(localStorage.getItem('lumaProductosSheet')) || [];
}