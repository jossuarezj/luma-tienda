// email.js
export async function enviarCorreoConfirmacion(datosCompra) {
    // Crear HTML de productos
    const productosHTML = datosCompra.productos.map(p => `
        <div class="product-item">
            <span>${p.NOMBRE} - ${p.talla} x${p.cantidad}</span>
            <span>$${p.PRECIO}</span>
        </div>
    `).join('');
    
    const templateParams = {
        nombre: datosCompra.nombre || 'Cliente',
        numeroPedido: datosCompra.numeroPedido || 'LUMA-' + Date.now(),
        total: datosCompra.total ? datosCompra.total.toLocaleString() : '0',
        metodoPago: datosCompra.metodoPago === 'epayco' ? 'Tarjeta de crédito (ePayco)' : 'Contra entrega (efectivo)',
        direccion: datosCompra.direccion || 'No especificada',
        ciudad: datosCompra.ciudad || 'No especificada',
        productos: productosHTML,
        email_cliente: datosCompra.email || 'cliente@email.com'
    };
    
    // Verificar que todas las variables tengan valor
    console.log('Variables enviadas:', templateParams);
    
    try {
        const response = await emailjs.send('service_nfns0rk', 'template_0x1dgor', templateParams);
        console.log('✅ Correo enviado', response);
        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Detalle:', error.text);
        return false;
    }
}