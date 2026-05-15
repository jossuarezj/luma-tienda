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
    
    // 1. Intentar recuperar cupón desde localStorage (guardado por cart.js)
    const cuponGuardado = localStorage.getItem('luma_current_coupon');
    if (cuponGuardado) {
        cuponInfo = JSON.parse(cuponGuardado);
        console.log("✅ Cupón recuperado de luma_current_coupon:", cuponInfo);
    } else if (cuponAplicado) {
        // Fallback: intentar desde Firestore
        try {
            const { cargarCuponesFirestore } = await import('./firebase-cupones.js');
            const cuponesFS = await cargarCuponesFirestore();
            cuponInfo = cuponesFS.find(c => c.codigo === cuponAplicado && c.activo === true);
            if (cuponInfo) {
                console.log("✅ Cupón recuperado desde Firestore:", cuponInfo);
            }
        } catch(e) { console.log("Error cargando cupón desde Firestore", e); }
    }
    
    if (cuponInfo && (!cuponInfo.usosPorUsuario || !cuponInfo.usosPorUsuario.includes(user.email))) {
        // 🔥 Calcular subtotal elegible según la regla del cupón (individuales, packs, producto)
        // Para ello necesitamos la función calcularSubtotalElegible que está en cart.js
        // La importaremos dinámicamente
        const { calcularSubtotalElegible } = await import('./cart.js');
        const subtotalElegible = calcularSubtotalElegible(itemsVisibles, cuponInfo);
        
        if (cuponInfo.tipo === "porcentaje") {
            descuento = subtotalElegible * (cuponInfo.valor / 100);
        } else {
            descuento = Math.min(cuponInfo.valor, subtotalElegible);
        }
        console.log(`💰 Descuento aplicado: ${descuento} (cupón ${cuponInfo.codigo} - ${cuponInfo.valor}% sobre $${subtotalElegible})`);
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
        // 1. Guardar en localStorage (backup)
        let compras = JSON.parse(localStorage.getItem('lumaCompras')) || [];
        const nuevaCompra = {
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
        };
        compras.push(nuevaCompra);
        localStorage.setItem('lumaCompras', JSON.stringify(compras));

        // 2. Guardar en Firestore (IMPORTANTE)
        try {
            const { guardarVentaFirestore } = await import('./firebase-ventas.js');
            const ventaData = {
                usuario: user.name,
                email: user.email,
                uid: user.uid,
                productos: itemsVisibles,
                subtotal: subtotal,
                descuento: descuento,
                cuponAplicado: cuponAplicado,
                envio: costoEnvio,
                total: totalConEnvio,
                metodoPago: "epayco",
                estado: "Pagado",
                estadoEnvio: "confirmado",
                numeroPedido: nuevaCompra.numeroPedido,
                fecha: new Date().toISOString()
            };
            const ventaId = await guardarVentaFirestore(ventaData);
            console.log("✅ Venta guardada en Firestore con ID:", ventaId);
        } catch (error) {
            console.error("❌ Error guardando venta en Firestore:", error);
        }

        // 3. Enviar correo de confirmación (como ya está)
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
                numeroPedido: nuevaCompra.numeroPedido,
                total: totalConEnvio,
                metodoPago: 'epayco',
                direccion: 'Pago en línea',
                ciudad: 'No aplica',
                productos: productosCorreo,
                subtotal: subtotal,
                descuento: descuento,
                costoEnvio: costoEnvio,
                envioGratis: costoEnvio === 0
            };
            await enviarCorreoConfirmacion(datosCorreo);
            console.log('✅ Correo enviado');
        } catch (errorCorreo) {
            console.error('❌ Error al enviar correo:', errorCorreo);
        }

        // 4. Marcar cupón como usado (si aplica)
        const userActual = getCurrentUser();
        if (userActual && userActual.email && !usedCoupon) {
            localStorage.setItem(`luma_descuento_usado_${userActual.email}`, 'true');
            usedCoupon = true;
            localStorage.setItem('lumaCouponUsed', 'true');
        }

        // 5. Limpiar carrito y cupones
        localStorage.removeItem('lumaCart');
        localStorage.removeItem('cuponAplicado');
        localStorage.removeItem('luma_current_coupon');

        // 6. Mostrar notificación y recargar
        showNotification(`✨ ¡Pago exitoso! Gracias por tu compra ${user.name} ✨`);
        window.location.reload();
    } else {
        showNotification("❌ El pago no se completó. Intenta nuevamente.");
    }
};
    } catch (error) {
        console.error("❌ Error al abrir ePayco:", error);
        showNotification("Error al procesar el pago. Intenta nuevamente.");
    }
}