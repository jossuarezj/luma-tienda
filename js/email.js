// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");
    console.log("📦 Datos de compra completos:", JSON.stringify(datosCompra, null, 2));
    
    // Crear HTML de productos como string
    let productosHTML = '';
    
    // Verificar dónde están los productos
    let productosArray = datosCompra.productos || [];
    
    if (productosArray.length === 0 && datosCompra.itemsParaGuardar) {
        productosArray = datosCompra.itemsParaGuardar;
    }
    
    if (productosArray.length > 0) {
        for (const p of productosArray) {
            const nombre = p.nombre || p.NOMBRE || p.nombreProducto || p.name || 'Producto';
            const color = p.colorNombre || p.COLORNOMBRE || p.color || '';
            const talla = p.talla || p.TALLA || '';
            const cantidad = p.cantidad || 1;
            let precio = p.precio || p.PRECIO || 0;
            
            if (p.esPack && p.productosIncluidosDetalle && p.productosIncluidosDetalle.length > 0) {
                productosHTML += `
                    <div style="margin-bottom:15px;padding:10px;background:#E8DCCC;border-radius:12px;">
                        <p style="font-weight:bold;margin-bottom:8px;">📦 ${nombre}</p>
                `;
                for (const detalle of p.productosIncluidosDetalle) {
                    const detalleNombre = detalle.nombre || detalle.NOMBRE || 'Producto';
                    const detalleColor = detalle.colorNombre || detalle.COLORNOMBRE || '';
                    const detalleTalla = detalle.talla || '';
                    const detalleCantidad = detalle.cantidad || 1;
                    productosHTML += `
                        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #D7C9B2;">
                            <span>• ${detalleNombre} ${detalleColor} ${detalleTalla ? `(Talla ${detalleTalla})` : ''}</span>
                            <span>x${detalleCantidad}</span>
                        </div>
                    `;
                }
                productosHTML += `</div>`;
            } else {
                const subtotalProducto = precio * cantidad;
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
    
    // Eliminar saltos de línea excesivos para evitar corrupción en EmailJS
    productosHTML = productosHTML.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // Obtener dirección de envío
    let direccion = 'No especificada';
    let ciudad = 'No especificada';
    if (datosCompra.datosEnvio) {
        direccion = datosCompra.datosEnvio.direccion || direccion;
        ciudad = datosCompra.datosEnvio.ciudad || ciudad;
    } else if (datosCompra.direccion) {
        direccion = datosCompra.direccion;
        ciudad = datosCompra.ciudad || ciudad;
    }
    
    // Obtener valores numéricos (sin formato de moneda)
    const subtotalNum = Number(datosCompra.subtotal) || 0;
    const descuentoNum = Number(datosCompra.descuento) || 0;
    let costoEnvioNum = Number(datosCompra.costoEnvio) || 0;
    if (datosCompra.envioGratis) costoEnvioNum = 0;
    const totalNum = Number(datosCompra.total) || 0;
    
    // Formatear moneda para mostrar (como string)
    const subtotalFormateado = `$${subtotalNum.toLocaleString()}`;
    const descuentoFormateado = descuentoNum > 0 ? `-$${descuentoNum.toLocaleString()}` : '';
    const envioFormateado = datosCompra.envioGratis ? 'GRATIS' : `$${costoEnvioNum.toLocaleString()}`;
    const totalFormateado = `$${totalNum.toLocaleString()}`;
    
    // Construir parámetros para EmailJS
    const templateParams = {
        email_cliente: datosCompra.email || 'cliente@email.com',
        nombre: datosCompra.nombre || datosCompra.usuario || datosCompra.nombreCliente || 'Cliente',
        numeroPedido: datosCompra.numeroPedido || 'LUMA-' + Date.now(),
        subtotal: subtotalFormateado,
        descuento: descuentoFormateado,   // string vacío si no hay descuento
        costoEnvio: envioFormateado,
        total: totalFormateado,
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML
    };
    
    // Verificar que ningún valor sea undefined o null
    Object.keys(templateParams).forEach(key => {
        if (templateParams[key] === undefined || templateParams[key] === null) {
            templateParams[key] = '';
            console.warn(`⚠️ La variable ${key} estaba vacía, se reemplazó por string vacío`);
        }
    });
    
    console.log("📧 Template params finales (enviados a EmailJS):", JSON.stringify(templateParams, null, 2));
    
    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado exitosamente', response);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        console.error('Detalle del error:', error.text);
        return false;
    }
}