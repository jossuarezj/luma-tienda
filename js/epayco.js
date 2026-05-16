import { enviarCorreoConfirmacion } from './email.js';
import { getCurrentUser } from './auth.js';

const EPaycoKey = "51fb6f62a2481396912cdc2951be0d78"; // Cámbiala por producción cuando corresponda
const ESandbox = true; // Cambia a false en producción

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification fixed bottom-4 right-4 bg-[#4d4845] text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Función global para procesar el pago exitoso al regresar de ePayco
window.procesarPagoExitosoEpayco = async function(refPayco) {
    console.log("📦 Procesando pago exitoso con ref_payco:", refPayco);
    // Recuperar datos guardados antes del pago
    const pendingJSON = localStorage.getItem('epayco_pending_transaction');
    if (!pendingJSON) {
        console.error("No hay transacción pendiente");
        return;
    }
    const pending = JSON.parse(pendingJSON);
    const { user, itemsVisibles, subtotal, descuento, costoEnvio, totalConEnvio, cuponAplicado, usedCoupon } = pending;
    
    if (!user) {
        console.error("Usuario no disponible");
        return;
    }
    
    // Generar número de pedido único
    const numeroPedido = 'LUMA-' + Date.now();
    
    // 1. Guardar en Firestore
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
            numeroPedido: numeroPedido,
            fecha: new Date().toISOString(),
            refPayco: refPayco
        };
        const ventaId = await guardarVentaFirestore(ventaData);
        console.log("✅ Venta guardada en Firestore con ID:", ventaId);
    } catch (error) {
        console.error("❌ Error guardando en Firestore:", error);
        showNotification("Error al guardar la compra. Contacta a soporte.", "error");
        return;
    }
    
    // 2. Enviar correo de confirmación
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
            numeroPedido: numeroPedido,
            subtotal: subtotal,
            descuento: descuento,
            costoEnvio: costoEnvio,
            envioGratis: costoEnvio === 0,
            total: totalConEnvio,
            metodoPago: 'epayco',
            direccion: 'Pago en línea',
            ciudad: 'No aplica',
            productos: productosCorreo
        };
        await enviarCorreoConfirmacion(datosCorreo);
        console.log("✅ Correo enviado");
    } catch (error) {
        console.error("❌ Error enviando correo:", error);
    }
    
    // 3. Limpiar carrito, cupones y datos pendientes
    localStorage.removeItem('lumaCart');
    localStorage.removeItem('cuponAplicado');
    localStorage.removeItem('luma_current_coupon');
    localStorage.removeItem('epayco_pending_transaction');
    if (user.email && !usedCoupon) {
        localStorage.setItem(`luma_descuento_usado_${user.email}`, 'true');
    }
    
    // 4. Eliminar parámetros de la URL para no reprocesar
    window.history.replaceState({}, document.title, window.location.pathname);
    
    showNotification(`✨ ¡Pago exitoso! Gracias por tu compra ${user.name} ✨`);
    setTimeout(() => {
        window.location.reload();
    }, 2000);
};

export async function procesarPagoConEpayco(cart, usedCoupon) {
    console.log("🔍 Iniciando pago con ePayco...");
    
    const user = getCurrentUser();
    if (!user) { 
        import('./auth.js').then(module => module.showRegisterModal()); 
        return; 
    }
    
    const itemsVisibles = cart.filter(item => !item.esParteDePack);
    if (itemsVisibles.length === 0) { 
        showNotification('🛒 Tu carrito está vacío'); 
        return; 
    }
    
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    
    let descuento = 0;
    let cuponAplicado = localStorage.getItem('cuponAplicado');
    let cuponInfo = null;
    const cuponGuardado = localStorage.getItem('luma_current_coupon');
    if (cuponGuardado) {
        cuponInfo = JSON.parse(cuponGuardado);
    } else if (cuponAplicado) {
        try {
            const { cargarCuponesFirestore } = await import('./firebase-cupones.js');
            const cuponesFS = await cargarCuponesFirestore();
            cuponInfo = cuponesFS.find(c => c.codigo === cuponAplicado && c.activo === true);
        } catch(e) { console.log("Error cargando cupón", e); }
    }
    
    if (cuponInfo && (!cuponInfo.usosPorUsuario || !cuponInfo.usosPorUsuario.includes(user.email))) {
        const { calcularSubtotalElegible } = await import('./cart.js');
        const subtotalElegible = calcularSubtotalElegible(itemsVisibles, cuponInfo);
        if (cuponInfo.tipo === "porcentaje") {
            descuento = subtotalElegible * (cuponInfo.valor / 100);
        } else {
            descuento = Math.min(cuponInfo.valor, subtotalElegible);
        }
        console.log(`💰 Descuento: ${descuento}`);
    }
    
    const UMBRAL_ENVIO_GRATIS = 99990;
    const costoEnvio = subtotal >= UMBRAL_ENVIO_GRATIS ? 0 : 17500;
    const totalConEnvio = subtotal - descuento + costoEnvio;
    
    // Guardar datos de la transacción pendiente en localStorage
    const pendingTransaction = {
        user: {
            name: user.name,
            email: user.email,
            uid: user.uid
        },
        itemsVisibles: itemsVisibles,
        subtotal: subtotal,
        descuento: descuento,
        costoEnvio: costoEnvio,
        totalConEnvio: totalConEnvio,
        cuponAplicado: cuponAplicado,
        usedCoupon: usedCoupon
    };
    localStorage.setItem('epayco_pending_transaction', JSON.stringify(pendingTransaction));
    
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
            response: window.location.href.split('?')[0] + "?payment=success",
            confirmation: window.location.href.split('?')[0] + "?payment=confirm",
            methods: ["TC", "PSE", "NEQUI", "CASH"],
            autoclick: false,
            style: { theme: "dark", background: "#4d4845", color: "#FFFFFF" }
        };
        
        console.log("Datos de pago:", datosPago);
        handler.open(datosPago);
    } catch (error) {
        console.error("❌ Error al abrir ePayco:", error);
        showNotification("Error al procesar el pago. Intenta nuevamente.");
    }
}