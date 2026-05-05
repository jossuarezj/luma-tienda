export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo...", datosCompra);
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    }
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
            const precio = p.precio || p.PRECIO || 0;
            const subtotalProducto = precio * cantidad;
            productosHTML += `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #D7C9B2;padding:10px 0;"><span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''} x${cantidad}</span><span>$${subtotalProducto.toLocaleString()}</span></div>`;
        }
    }
    productosHTML = productosHTML.replace(/\n/g, '').replace(/\s{2,}/g, ' ');
    let direccion = 'No especificada', ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = escapeHtml(datosCompra.datosEnvio.direccion) || direccion;
        ciudad = escapeHtml(datosCompra.datosEnvio.ciudad) || ciudad;
    } else if (datosCompra.direccion) {
        direccion = escapeHtml(datosCompra.direccion);
        ciudad = escapeHtml(datosCompra.ciudad) || ciudad;
    }
    const subtotalNum = Number(datosCompra.subtotal) || 0;
    const descuentoNum = Number(datosCompra.descuento) || 0;
    let costoEnvioNum = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) costoEnvioNum = 0;
    const totalNum = Number(datosCompra.total) || 0;
    const subtotalStr = `$${subtotalNum.toLocaleString()}`;
    const descuentoStr = descuentoNum > 0 ? `$${descuentoNum.toLocaleString()}` : '';
    const envioStr = datosCompra.envioGratis ? 'GRATIS' : `$${costoEnvioNum.toLocaleString()}`;
    const totalStr = `$${totalNum.toLocaleString()}`;
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: escapeHtml(datosCompra.nombre || datosCompra.usuario || 'Cliente'),
        numeroPedido: escapeHtml(datosCompra.numeroPedido || `LUMA-${Date.now()}`),
        subtotal: subtotalStr,
        descuento: descuentoStr,
        costoEnvio: envioStr,
        total: totalStr,
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };
    Object.keys(templateParams).forEach(k => { if (templateParams[k] === undefined || templateParams[k] === null) templateParams[k] = ''; });
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