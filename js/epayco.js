import { enviarCorreoConfirmacion } from './email.js';
import { getCurrentUser } from './auth.js';

const EPaycoKey = "51fb6f62a2481396912cdc2951be0d78";
const ESandbox = true;

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification fixed bottom-4 right-4 bg-[#4d4845] text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

export async function procesarPagoConEpayco(cart, usedCoupon) {
    console.log("🔍 Iniciando pago con ePayco...");
    
    const user = getCurrentUser();
    if (!user) { 
        import('./auth.js').then(module => module.showRegisterModal()); 
        return; 
    }
    
    const itemsVisibles = cart.filter(item => !item.esParteDePack);
    console.log("Items visibles:", itemsVisibles);
    
    if (itemsVisibles.length === 0) { 
        showNotification('🛒 Tu carrito está vacío'); 
        return; 
    }
    
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    console.log("Subtotal:", subtotal);
    
    // Calcular descuento
    let descuento = 0;
    let cuponAplicado = localStorage.getItem('cuponAplicado');
    let cuponInfo = null;
    
    if (cuponAplicado) {
        // Intentar cargar desde localStorage primero
        const cuponesLocal = JSON.parse(localStorage.getItem('lumaCupones')) || {};
        cuponInfo = cuponesLocal[cuponAplicado];
        
        // Si no está en localStorage, intentar desde Firestore (simplificado)
        if (!cuponInfo) {
            try {
                const { cargarCuponesFirestore } = await import('./firebase-cupones.js');
                const cuponesFS = await cargarCuponesFirestore();
                cuponInfo = cuponesFS.find(c => c.codigo === cuponAplicado && c.activo === true);
            } catch(e) { console.log("Error cargando cupón desde Firestore", e); }
        }
        
        if (cuponInfo && !cuponInfo.usado) {
            if (cuponInfo.tipo === "porcentaje") {
                descuento = subtotal * (cuponInfo.valor / 100);
            } else {
                descuento = Math.min(cuponInfo.valor, subtotal);
            }
        }
    } else if (user.primeraCompra && !usedCoupon) {
        // Verificar si hay productos individuales (NO packs)
        const hayProductosIndividuales = itemsVisibles.some(item => !item.esPack);
        if (hayProductosIndividuales) {
            descuento = subtotal * 0.3;
        }
    }
    
    // Calcular envío
    const UMBRAL_ENVIO_GRATIS = 99990;
    const costoEnvio = subtotal >= UMBRAL_ENVIO_GRATIS ? 0 : 17500;
    const totalConDescuento = subtotal - descuento;
    const totalConEnvio = totalConDescuento + costoEnvio;
    
    console.log("Descuento aplicado:", descuento);
    console.log("Subtotal con descuento:", totalConDescuento);
    console.log("Costo envío:", costoEnvio);
    console.log("Total a pagar:", totalConEnvio);
    
    const descripcionProductos = itemsVisibles.map(item => 
        `${item.nombre} ${item.colorNombre || ''} ${item.talla ? `Talla ${item.talla}` : ''} x${item.cantidad}`
    ).join(', ');
    
    if (typeof ePayco === 'undefined') {
        console.error("❌ ePayco no está cargado");
        showNotification("Error: ePayco no está listo. Recarga la página.");
        return;
    }
    
    try {
        const handler = ePayco.checkout.configure({
            key: EPaycoKey,
            test: ESandbox,
            external: false
        });
        
        const datosPago = {
            name: "LUMA Colombia",
            description: descripcionProductos.substring(0, 150) + (costoEnvio > 0 ? ` + Envío $${costoEnvio.toLocaleString()}` : " + Envío GRATIS"),
            invoice: "LUMA-" + Date.now(),
            currency: "cop",
            amount: totalConEnvio.toString(),
            tax_base: "0",
            tax: "0",
            country: "CO",
            lang: "es",
            name_billing: user.name || "Cliente",
            surname_billing: "",
            email_billing: user.email || "cliente@luma.co",
            phone_billing: "",
            address_billing: "",
            response: window.location.href + "?payment=success",
            confirmation: window.location.href + "?payment=confirm",
            methods: ["TC", "PSE", "NEQUI", "CASH"],
            autoclick: false,
            style: { theme: "dark", background: "#4d4845", color: "#FFFFFF" }
        };
        
        console.log("Datos de pago:", datosPago);
        handler.open(datosPago);
        
        window.epaycoCallback = async function(response) {
            console.log("Respuesta ePayco:", response);
            if (response && response.status === "Aceptada") {
                let compras = JSON.parse(localStorage.getItem('lumaCompras')) || [];
                compras.push({ 
                    id: Date.now(), 
                    numeroPedido: 'LUMA-' + Date.now(),
                    nombreCliente: user.name,
                    usuario: user.name, 
                    email: user.email, 
                    fecha: new Date().toISOString(), 
                    productos: itemsVisibles, 
                    subtotal: subtotal, 
                    descuento: descuento,
                    cuponAplicado: cuponAplicado,
                    envio: costoEnvio,
                    total: totalConEnvio,
                    metodoPago: "epayco",
                    estado: "Pagado"
                });
                localStorage.setItem('lumaCompras', JSON.stringify(compras));

                try {
                    const productosCorreo = itemsVisibles.map(item => ({
                        nombre: item.nombre,
                        talla: item.talla || 'Única',
                        cantidad: item.cantidad,
                        precio: item.precio
                    }));
                    
                    const datosCorreo = {
                        nombre: user.name || 'Cliente',
                        email: user.email || 'cliente@email.com',
                        numeroPedido: 'LUMA-' + Date.now(),
                        total: totalConEnvio,
                        metodoPago: 'epayco',
                        direccion: 'Pago en línea',
                        ciudad: 'No aplica',
                        productos: productosCorreo
                    };
                    
                    await enviarCorreoConfirmacion(datosCorreo);
                    console.log('✅ Correo enviado');
                } catch (errorCorreo) {
                    console.error('❌ Error al enviar correo:', errorCorreo);
                }
                
                const userActual = getCurrentUser();
                if (userActual && userActual.email && !usedCoupon) {
                    localStorage.setItem(`luma_descuento_usado_${userActual.email}`, 'true');
                    usedCoupon = true;
                    localStorage.setItem('lumaCouponUsed', 'true');
                }
                
                localStorage.removeItem('lumaCart');
                localStorage.removeItem('cuponAplicado');
                window.location.reload();
                showNotification(`✨ ¡Pago exitoso! Gracias por tu compra ${user.name} ✨`);
            } else {
                showNotification("❌ El pago no se completó. Intenta nuevamente.");
            }
        };
    } catch (error) {
        console.error("❌ Error al abrir ePayco:", error);
        showNotification("Error al procesar el pago. Intenta nuevamente.");
    }
}