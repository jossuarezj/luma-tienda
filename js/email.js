// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");
    console.log("📦 Datos de compra:", datosCompra);

    // Limpia caracteres peligrosos para EmailJS
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

    // 1. Productos HTML
    let productosHTML = '';
    let productosArray = datosCompra.productos || [];
    if (productosArray.length === 0 && datosCompra.itemsParaGuardar) {
        productosArray = datosCompra.itemsParaGuardar;
    }

    if (productosArray.length > 0) {
        for (const p of productosArray) {
            const nombre = sanitize(p.nombre || p.NOMBRE || p.nombreProducto || p.name || 'Producto');
            const color = sanitize(p.colorNombre || p.COLORNOMBRE || p.color || '');
            const talla = sanitize(p.talla || p.TALLA || '');
            const cantidad = p.cantidad || 1;
            const precio = p.precio || p.PRECIO || 0;
            const subtotalProducto = precio * cantidad;

            if (p.esPack && p.productosIncluidosDetalle && p.productosIncluidosDetalle.length > 0) {
                productosHTML += `
                    <div style="margin-bottom:15px;padding:10px;background:#E8DCCC;border-radius:12px;">
                        <p style="font-weight:bold;margin-bottom:8px;">📦 ${nombre}</p>
                `;
                for (const detalle of p.productosIncluidosDetalle) {
                    const dNombre = sanitize(detalle.nombre || detalle.NOMBRE || 'Producto');
                    const dColor = sanitize(detalle.colorNombre || detalle.COLORNOMBRE || '');
                    const dTalla = sanitize(detalle.talla || '');
                    const dCant = detalle.cantidad || 1;
                    productosHTML += `
                        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #D7C9B2;">
                            <span>• ${dNombre} ${dColor} ${dTalla ? `(Talla ${dTalla})` : ''}</span>
                            <span>x${dCant}</span>
                        </div>
                    `;
                }
                productosHTML += `</div>`;
            } else {
                productosHTML += `
                    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #D7C9B2;">
                        <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''} x${cantidad}</span>
                        <span>$${subtotalProducto.toLocaleString()}</span>
                    </div>
                `;
            }
        }
    } else {
        productosHTML = '<p>No hay productos registrados</p>';
    }
    productosHTML = productosHTML.replace(/\n/g, '').replace(/\s{2,}/g, ' ');

    // 2. Dirección
    let direccion = 'No especificada';
    let ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = sanitize(datosCompra.datosEnvio.direccion) || direccion;
        ciudad = sanitize(datosCompra.datosEnvio.ciudad) || ciudad;
    } else if (datosCompra.direccion) {
        direccion = sanitize(datosCompra.direccion);
        ciudad = sanitize(datosCompra.ciudad) || ciudad;
    }

    // 3. Números (sin símbolo de moneda, solo el número formateado)
    const subtotalNum = Number(datosCompra.subtotal) || 0;
    const descuentoNum = Number(datosCompra.descuento) || 0;
    let costoEnvioNum = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) costoEnvioNum = 0;
    const totalNum = Number(datosCompra.total) || 0;

    const subtotalStr = subtotalNum.toLocaleString();
    const descuentoStr = descuentoNum > 0 ? descuentoNum.toLocaleString() : '';
    const envioStr = datosCompra.envioGratis ? 'GRATIS' : costoEnvioNum.toLocaleString();
    const totalStr = totalNum.toLocaleString();

    // 4. Parámetros para EmailJS (todos strings limpios)
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: sanitize(datosCompra.nombre || datosCompra.usuario || datosCompra.nombreCliente || 'Cliente'),
        numeroPedido: sanitize(datosCompra.numeroPedido || `LUMA-${Date.now()}`),
        subtotal: subtotalStr,
        descuento: descuentoStr,      // vacío si no hay descuento
        costoEnvio: envioStr,
        total: totalStr,
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };

    // Reemplazar undefined/null por string vacío
    Object.keys(templateParams).forEach(k => {
        if (templateParams[k] === undefined || templateParams[k] === null) templateParams[k] = '';
    });

    console.log("📧 Enviando a EmailJS:", templateParams);

    try {
        // ⚠️ CAMBIA 'template_0x1dgor' POR EL ID DE TU NUEVO TEMPLATE ⚠️
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado', response);
        return true;
    } catch (error) {
        console.error('❌ Error EmailJS:', error);
        if (error.text) console.error('Detalle:', error.text);
        return false;
    }
}