// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo...", datosCompra);

    // Sanitización extrema para EmailJS
    function sanitize(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/[\n\r]/g, ' ')   // elimina saltos de línea
            .replace(/\s+/g, ' ')       // espacios múltiples a uno
            .trim();
    }

    // ========== 1. Construir HTML de productos de forma SEGURA ==========
    let productosHTML = '';
    let productosArray = datosCompra.productos || [];
    if (productosArray.length === 0 && datosCompra.itemsParaGuardar) {
        productosArray = datosCompra.itemsParaGuardar;
    }

    if (productosArray.length > 0) {
        for (const p of productosArray) {
            const nombre = sanitize(p.nombre || p.NOMBRE || 'Producto');
            const color = sanitize(p.colorNombre || p.COLORNOMBRE || '');
            const talla = sanitize(p.talla || '');
            const cantidad = p.cantidad || 1;
            const precio = p.precio || p.PRECIO || 0;
            const subtotal = precio * cantidad;

            // Producto normal (sin pack)
            productosHTML += `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #D7C9B2;">
                    <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''} x${cantidad}</span>
                    <span>$${subtotal.toLocaleString()}</span>
                </div>
            `;
        }
    } else {
        productosHTML = '<p>Sin productos</p>';
    }

    // Eliminar cualquier carácter extraño que pueda quedar
    productosHTML = productosHTML.replace(/[\n\r\t]/g, '').replace(/\s{2,}/g, ' ');

    // ========== 2. Dirección ==========
    let direccion = 'No especificada';
    let ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = sanitize(datosCompra.datosEnvio.direccion) || direccion;
        ciudad = sanitize(datosCompra.datosEnvio.ciudad) || ciudad;
    } else if (datosCompra.direccion) {
        direccion = sanitize(datosCompra.direccion);
        ciudad = sanitize(datosCompra.ciudad) || ciudad;
    }

    // ========== 3. Valores numéricos ==========
    const subtotal = Number(datosCompra.subtotal) || 0;
    const descuento = Number(datosCompra.descuento) || 0;
    let envio = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) envio = 0;
    const total = Number(datosCompra.total) || 0;

    // ========== 4. Parámetros para EmailJS (SIN descuento si es 0) ==========
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: sanitize(datosCompra.nombre || datosCompra.usuario || 'Cliente'),
        numeroPedido: sanitize(datosCompra.numeroPedido || `LUMA-${Date.now()}`),
        subtotal: subtotal.toLocaleString(),
        costoEnvio: datosCompra.envioGratis ? 'GRATIS' : envio.toLocaleString(),
        total: total.toLocaleString(),
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta (ePayco)' : 'Contra entrega',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };

    // Solo agregar 'descuento' si es mayor que 0
    if (descuento > 0) {
        templateParams.descuento = descuento.toLocaleString();
    }

    // Eliminar cualquier undefined/null
    Object.keys(templateParams).forEach(k => {
        if (templateParams[k] === undefined || templateParams[k] === null) {
            delete templateParams[k];
        }
    });

    console.log("📧 Enviando a EmailJS:", templateParams);

    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado', response);
        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        if (error.text) console.error('Detalle:', error.text);
        return false;
    }
}