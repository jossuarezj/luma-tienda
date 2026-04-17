// js/email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    console.log("📧 Enviando correo de confirmación...");
    console.log("📦 Datos de compra completos:", JSON.stringify(datosCompra, null, 2));
    
    // Crear HTML de productos como string
    let productosHTML = '';
    
    // Verificar dónde están los productos
    let productosArray = datosCompra.productos || [];
    
    console.log("📦 Productos array:", productosArray);
    
    if (productosArray.length === 0 && datosCompra.itemsParaGuardar) {
        productosArray = datosCompra.itemsParaGuardar;
    }
    
    if (productosArray.length > 0) {
        for (const p of productosArray) {
            console.log("📦 Procesando producto:", p);
            
            // Obtener nombre (probar todas las opciones posibles)
            const nombre = p.nombre || p.NOMBRE || p.nombreProducto || p.name || 'Producto';
            
            // Obtener color
            const color = p.colorNombre || p.COLORNOMBRE || p.color || '';
            
            // Obtener talla
            const talla = p.talla || p.TALLA || '';
            
            // Obtener cantidad
            const cantidad = p.cantidad || 1;
            
            // Obtener precio
            let precio = p.precio || p.PRECIO || 0;
            
            // Si es un pack con productos incluidos
            if (p.esPack && p.productosIncluidosDetalle && p.productosIncluidosDetalle.length > 0) {
                productosHTML += `
                    <div style="margin-bottom: 15px; padding: 10px; background: #E8DCCC; border-radius: 12px;">
                        <p style="font-weight: bold; margin-bottom: 8px;">📦 ${nombre}</p>
                `;
                for (const detalle of p.productosIncluidosDetalle) {
                    const detalleNombre = detalle.nombre || detalle.NOMBRE || 'Producto';
                    const detalleColor = detalle.colorNombre || detalle.COLORNOMBRE || '';
                    const detalleTalla = detalle.talla || '';
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
                        <span>${nombre} ${color} ${talla ? `Talla ${talla}` : ''}</span>
                        <span>x${cantidad} - $${(precio * cantidad).toLocaleString()}</span>
                    </div>
                `;
            }
        }
    } else {
        productosHTML = '<p>No hay productos registrados</p>';
    }
    
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
    
    // Preparar los parámetros para EmailJS
    const templateParams = {
        nombre: datosCompra.nombre || datosCompra.usuario || datosCompra.nombreCliente || 'Cliente',
        numeroPedido: datosCompra.numeroPedido || 'LUMA-' + Date.now(),
        total: datosCompra.total ? datosCompra.total.toLocaleString() : '0',
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: direccion,
        ciudad: ciudad,
        productos: productosHTML,
        email_cliente: datosCompra.email || 'cliente@email.com'
    };
    
    console.log("📧 Template params:", templateParams);
    
    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado exitosamente', response);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return false;
    }
}