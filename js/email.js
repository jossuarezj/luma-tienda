// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");
    console.log("📦 Datos de compra:", datosCompra);

    // Función para escapar caracteres HTML peligrosos
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ');
    }

    // 1. Construir productosHTML sanitizado
    let productosHTML = '';
    const productosArray = datosCompra.productos || [];

    if (productosArray.length === 0) {
        productosHTML = '<p>No hay productos registrados</p>';
    } else {
        for (const p of productosArray) {
            const nombre = escapeHtml(p.nombre || p.NOMBRE || 'Producto');
            const color = escapeHtml(p.colorNombre || p.COLORNOMBRE || p.color || '');
            const talla = escapeHtml(p.talla || '');
            const cantidad = p.cantidad || 1;
            let precio = p.precio || p.PRECIO || 0;
            const subtotalProducto = precio * cantidad;

            productosHTML += `
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #D7C9B2;">
                    <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''} x${cantidad}</span>
                    <span>$${subtotalProducto.toLocaleString()}</span>
                </div>
            `;
        }
    }

    // Eliminar saltos de línea y espacios redundantes (por si acaso)
    productosHTML = productosHTML.replace(/\n/g, '').replace(/\s{2,}/g, ' ');

    // 2. Obtener dirección
    let direccion = 'No especificada';
    let ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = escapeHtml(datosCompra.datosEnvio.direccion) || direccion;
        ciudad = escapeHtml(datosCompra.datosEnvio.ciudad) || ciudad;
    } else if (datosCompra.direccion) {
        direccion = escapeHtml(datosCompra.direccion);
        ciudad = escapeHtml(datosCompra.ciudad) || ciudad;
    }

    // 3. Valores numéricos y formateo SEGURO para EmailJS
    const subtotalNum = Number(datosCompra.subtotal) || 0;
    const descuentoNum = Number(datosCompra.descuento) || 0;
    let costoEnvioNum = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) costoEnvioNum = 0;
    const totalNum = Number(datosCompra.total) || 0;

    // Formato para mostrar en el correo (con separadores de miles)
    const subtotalStr = `$${subtotalNum.toLocaleString()}`;
    const descuentoStr = descuentoNum > 0 ? `-$${descuentoNum.toLocaleString()}` : '';
    const envioStr = datosCompra.envioGratis ? 'GRATIS' : `$${costoEnvioNum.toLocaleString()}`;
    const totalStr = `$${totalNum.toLocaleString()}`;

    // 4. Construir parámetros para EmailJS (todos como strings planos)
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: escapeHtml(datosCompra.nombre || datosCompra.usuario || 'Cliente'),
        numeroPedido: escapeHtml(datosCompra.numeroPedido || `LUMA-${Date.now()}`),
        subtotal: subtotalStr,
        descuento: descuentoStr,   // string vacío si no hay descuento
        costoEnvio: envioStr,
        total: totalStr,
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };

    // Verificar que ningún parámetro sea undefined o null
    for (const key in templateParams) {
        if (templateParams[key] === undefined || templateParams[key] === null) {
            templateParams[key] = '';
            console.warn(`⚠️ Variable ${key} estaba vacía, se reemplazó por string vacío`);
        }
    }

    console.log("📧 Enviando a EmailJS:", templateParams);

    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado', response);
        return true;
    } catch (error) {
        console.error('❌ Error EmailJS:', error);
        console.error('Detalle:', error.text);
        return false;
    }
}