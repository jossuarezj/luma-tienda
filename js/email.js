// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");
    
    // Crear HTML de productos como string
    let productosHTML = '';
    
    if (datosCompra.productos && datosCompra.productos.length > 0) {
        for (const p of datosCompra.productos) {
            // Verificar si es un pack con productos incluidos
            if (p.esPack && p.productosIncluidosDetalle && p.productosIncluidosDetalle.length > 0) {
                productosHTML += `
                    <div style="margin-bottom: 15px; padding: 10px; background: #E8DCCC; border-radius: 12px;">
                        <p style="font-weight: bold; margin-bottom: 8px;">📦 ${p.nombre || p.NOMBRE}</p>
                `;
                for (const detalle of p.productosIncluidosDetalle) {
                    productosHTML += `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #D7C9B2;">
                            <span>• ${detalle.nombre} - ${detalle.colorNombre} (Talla ${detalle.talla})</span>
                            <span>x${detalle.cantidad}</span>
                        </div>
                    `;
                }
                productosHTML += `</div>`;
            } else {
                // Producto normal
                const nombre = p.nombre || p.NOMBRE || 'Producto';
                const color = p.colorNombre || p.COLORNOMBRE || '';
                const talla = p.talla || '';
                const cantidad = p.cantidad || 1;
                productosHTML += `
                    <div class="product-item">
                        <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''}</span>
                        <span>x${cantidad}</span>
                    </div>
                `;
            }
        }
    } else {
        productosHTML = '<p>No hay productos registrados</p>';
    }
    
    // Obtener dirección de envío
    let direccion = datosCompra.direccion || 'No especificada';
    let ciudad = datosCompra.ciudad || 'No especificada';
    
    if (datosCompra.datosEnvio) {
        direccion = datosCompra.datosEnvio.direccion || direccion;
        ciudad = datosCompra.datosEnvio.ciudad || ciudad;
    }
    
    // Preparar los parámetros para EmailJS
    const templateParams = {
        nombre: datosCompra.nombre || datosCompra.usuario || 'Cliente',
        numeroPedido: datosCompra.numeroPedido || 'LUMA-' + Date.now(),
        total: datosCompra.total ? datosCompra.total.toLocaleString() : '0',
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML,  // ← Aquí va el HTML como string
        email_cliente: datosCompra.email || 'cliente@email.com'
    };
    
    console.log("📧 Variables enviadas:", templateParams);
    console.log("📧 Productos HTML:", productosHTML);
    
    try {
        const response = await emailjs.send('service_nfns0rk', 'dmsm1q8', templateParams);
        console.log('✅ Correo enviado exitosamente', response);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return false;
    }
}