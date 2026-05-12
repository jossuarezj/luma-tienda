// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");

    function sanitize(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    let productosHTML = '';
    let productosArray = datosCompra.productos || [];

    if (productosArray.length > 0) {
        for (const p of productosArray) {
            const nombre = sanitize(p.nombre || p.NOMBRE || 'Producto');
            const color = sanitize(p.colorNombre || p.COLORNOMBRE || '');
            const talla = sanitize(p.talla || '');
            const cantidad = p.cantidad || 1;
            const precio = p.precio || p.PRECIO || 0;
            const subtotal = precio * cantidad;
            productosHTML += `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #D7C9B2;">
                    <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''} x${cantidad}</span>
                    <span>$${subtotal.toLocaleString()}</span>
                </div>
            `;
        }
    } else {
        productosHTML = '<p>No hay productos registrados</p>';
    }

    // ===== AGREGAR DESCUENTO COMO PARTE DE LOS PRODUCTOS =====
    const descuentoNum = Number(datosCompra.descuento) || 0;
    if (descuentoNum > 0) {
        productosHTML += `
            <div style="display:flex;justify-content:space-between;padding:8px 0;color:#27ae60; font-weight:500;">
                <span>🎉 Descuento aplicado</span>
                <span> -$${descuentoNum.toLocaleString()}</span>
            </div>
        `;
    }

    // Dirección
    let direccion = 'No especificada';
    let ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = sanitize(datosCompra.datosEnvio.direccion) || direccion;
        ciudad = sanitize(datosCompra.datosEnvio.ciudad) || ciudad;
    } else if (datosCompra.direccion) {
        direccion = sanitize(datosCompra.direccion);
        ciudad = sanitize(datosCompra.ciudad) || ciudad;
    }

    // Valores numéricos
    const subtotalNum = Number(datosCompra.subtotal) || 0;
    let costoEnvioNum = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) costoEnvioNum = 0;
    const totalNum = Number(datosCompra.total) || 0;

    // Parámetros para EmailJS (SIN descuento por separado)
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: sanitize(datosCompra.nombre || datosCompra.usuario || 'Cliente'),
        numeroPedido: sanitize(datosCompra.numeroPedido || `LUMA-${Date.now()}`),
        subtotal: subtotalNum.toLocaleString(),
        costoEnvio: datosCompra.envioGratis ? 'GRATIS' : costoEnvioNum.toLocaleString(),
        total: totalNum.toLocaleString(),
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };

    // Eliminar undefined/null
    Object.keys(templateParams).forEach(k => {
        if (templateParams[k] === undefined || templateParams[k] === null) delete templateParams[k];
    });

    console.log("📧 Enviando a EmailJS:", templateParams);

    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado', response);
        return true;
    } catch (error) {
        console.error('❌ Error EmailJS:', error);
        if (error.text) console.error('Detalle:', error.text);
        return false;
    }
}