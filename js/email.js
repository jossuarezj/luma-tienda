// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");
    console.log("📦 Datos de compra completos:", JSON.stringify(datosCompra, null, 2));

    // Función para escapar caracteres peligrosos para EmailJS
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

    // Construir HTML de productos
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
            let precio = p.precio || p.PRECIO || 0;
            const subtotalProducto = precio * cantidad;

            // Manejo de packs (productos incluidos)
            if (p.esPack && p.productosIncluidosDetalle && p.productosIncluidosDetalle.length > 0) {
                productosHTML += `
                    <div style="margin-bottom: 15px; padding: 10px; background: #E8DCCC; border-radius: 12px;">
                        <p style="font-weight: bold; margin-bottom: 8px;">📦 ${nombre}</p>
                `;
                for (const detalle of p.productosIncluidosDetalle) {
                    const detalleNombre = sanitize(detalle.nombre || detalle.NOMBRE || 'Producto');
                    const detalleColor = sanitize(detalle.colorNombre || detalle.COLORNOMBRE || '');
                    const detalleTalla = sanitize(detalle.talla || '');
                    const detalleCantidad = detalle.cantidad || 1;
                    productosHTML += `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #D7C9B2;">
                            <span>• ${detalleNombre} ${detalleColor} ${detalleTalla ? `(Talla ${detalleTalla})` : ''}</span>
                            <span>x${detalleCantidad}</span>
                        </div>
                    `;
                }
                productosHTML += `</div>`;
            } else {
                // Producto normal
                productosHTML += `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #D7C9B2;">
                        <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''} x${cantidad}</span>
                        <span>$${subtotalProducto.toLocaleString()}</span>
                    </div>
                `;
            }
        }
    } else {
        productosHTML = '<p>No hay productos registrados</p>';
    }

    // Eliminar saltos de línea excesivos (por si acaso)
    productosHTML = productosHTML.replace(/\n/g, '').replace(/\s{2,}/g, ' ');

    // Obtener dirección de envío
    let direccion = 'No especificada';
    let ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = sanitize(datosCompra.datosEnvio.direccion) || direccion;
        ciudad = sanitize(datosCompra.datosEnvio.ciudad) || ciudad;
    } else if (datosCompra.direccion) {
        direccion = sanitize(datosCompra.direccion);
        ciudad = sanitize(datosCompra.ciudad) || ciudad;
    }

    // Preparar valores numéricos y formateo SEGURO
    const subtotalNum = Number(datosCompra.subtotal) || 0;
    const descuentoNum = Number(datosCompra.descuento) || 0;
    let costoEnvioNum = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) costoEnvioNum = 0;
    const totalNum = Number(datosCompra.total) || 0;

    // Formatear moneda (para mostrar en el correo)
    const subtotalFormateado = `$${subtotalNum.toLocaleString()}`;
    // Si el descuento es 0, enviamos string vacío para que no aparezca la línea en el template
    const descuentoFormateado = descuentoNum > 0 ? `$${descuentoNum.toLocaleString()}` : '';
    const envioFormateado = datosCompra.envioGratis ? 'GRATIS' : `$${costoEnvioNum.toLocaleString()}`;
    const totalFormateado = `$${totalNum.toLocaleString()}`;

    // Construir parámetros para EmailJS (todos los campos deben ser strings planos)
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: sanitize(datosCompra.nombre || datosCompra.usuario || datosCompra.nombreCliente || 'Cliente'),
        numeroPedido: sanitize(datosCompra.numeroPedido || `LUMA-${Date.now()}`),
        subtotal: subtotalFormateado,
        descuento: descuentoFormateado,   // vacío si no hay descuento
        costoEnvio: envioFormateado,
        total: totalFormateado,
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };

    // Verificar que ningún campo sea undefined o null
    Object.keys(templateParams).forEach(key => {
        if (templateParams[key] === undefined || templateParams[key] === null) {
            templateParams[key] = '';
            console.warn(`⚠️ La variable ${key} estaba vacía, se reemplazó por string vacío`);
        }
    });

    console.log("📧 TemplateParams enviados a EmailJS:", JSON.stringify(templateParams, null, 2));

    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado exitosamente', response);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        if (error.text) console.error('Detalle del error:', error.text);
        return false;
    }
}