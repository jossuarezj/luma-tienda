import { getCurrentUser } from './auth.js';
import { productos } from './products.js';
import { guardarVentaFirestore } from './firebase-ventas.js';

// Función de notificación (igual que en main.js)
function mostrarMensaje(mensaje, tipo = "success") {
    const notification = document.createElement('div');
    notification.className = 'notification fixed bottom-4 right-4 bg-[#4d4845] text-white px-6 py-3 rounded-lg shadow-lg z-50';
    let color = "#4d4845";
    if (tipo === "error") color = "#e74c3c";
    if (tipo === "warning") color = "#f39c12";
    if (tipo === "success") color = "#27ae60";
    notification.style.backgroundColor = color;
    notification.innerHTML = `<i class="fas ${tipo === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i>${mensaje}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

let cart = JSON.parse(localStorage.getItem('lumaCart')) || [];
let usedCoupon = localStorage.getItem('lumaCouponUsed') === 'true';
let updateCartUICallback = null;

// Variables para cupón
let cuponAplicado = localStorage.getItem('cuponAplicado') || null;
let cuponInfo = null;

// Variables para envío
let costoEnvio = 17500;
let envioGratis = false;
const UMBRAL_ENVIO_GRATIS = 99990;

// Cargar datos de envío guardados
let datosEnvio = JSON.parse(localStorage.getItem('lumaDatosEnvio')) || {};

if (cuponAplicado) {
    const cupones = JSON.parse(localStorage.getItem('lumaCupones')) || {};
    cuponInfo = cupones[cuponAplicado] || null;
}

export function setUpdateCartUI(callback) { updateCartUICallback = callback; }

function saveCart() { 
    console.log('💾 Guardando carrito:', cart);
    localStorage.setItem('lumaCart', JSON.stringify(cart)); 
    updateCartUI();
}

export function updateCartUI() {
    const user = getCurrentUser();
    const itemsVisibles = cart.filter(item => !item.esParteDePack);
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    
    // Calcular descuento
        // Calcular descuento
    let descuento = 0;
    
    // Verificar si hay productos individuales (NO packs)
    const hayProductosIndividuales = itemsVisibles.some(item => !item.esPack);
    
    if (cuponAplicado && cuponInfo && !cuponInfo.usado) {
        descuento = subtotal * (cuponInfo.valor / 100);
    } else if (user && user.primeraCompra && !usedCoupon && hayProductosIndividuales) {
        descuento = subtotal * 0.3;
    }
    
    // Calcular envío (gratis si subtotal >= umbral)
    envioGratis = subtotal >= UMBRAL_ENVIO_GRATIS;
    costoEnvio = envioGratis ? 0 : 17500;
    
    // Total
    const total = subtotal - descuento + costoEnvio;
    
    // Actualizar UI
    const cartCountEl = document.getElementById('cartCount');
    const cartSubtotalEl = document.getElementById('cartSubtotal');
    const cartEnvioEl = document.getElementById('cartEnvio');
    const cartTotalEl = document.getElementById('cartTotal');
    
    if (cartCountEl) cartCountEl.innerText = itemsVisibles.reduce((s, i) => s + i.cantidad, 0);
    if (cartSubtotalEl) cartSubtotalEl.innerHTML = `$${subtotal.toLocaleString()}`;
    if (cartEnvioEl) cartEnvioEl.innerHTML = envioGratis ? 'GRATIS' : `$${costoEnvio.toLocaleString()}`;
    if (cartTotalEl) cartTotalEl.innerHTML = `$${total.toLocaleString()}`;
    
    // Actualizar mensajes de envío
    const mensajeEnvioGratis = document.getElementById('mensajeEnvioGratis');
    const mensajeCostoEnvio = document.getElementById('mensajeCostoEnvio');
    const faltaParaEnvio = document.getElementById('faltaParaEnvio');
    
    if (envioGratis) {
        if (mensajeEnvioGratis) mensajeEnvioGratis.classList.remove('hidden');
        if (mensajeCostoEnvio) mensajeCostoEnvio.classList.add('hidden');
    } else {
        if (mensajeEnvioGratis) mensajeEnvioGratis.classList.add('hidden');
        if (mensajeCostoEnvio) mensajeCostoEnvio.classList.remove('hidden');
        if (faltaParaEnvio) faltaParaEnvio.innerText = `$${(UMBRAL_ENVIO_GRATIS - subtotal).toLocaleString()}`;
    }
    
    // Mostrar/ocultar fila de descuento
    const discountRow = document.getElementById('discountRow');
    const cartDiscount = document.getElementById('cartDiscount');
    if (descuento > 0 && cartDiscount && discountRow) {
        cartDiscount.innerHTML = `-$${descuento.toLocaleString()}`;
        discountRow.classList.remove('hidden');
    } else if (discountRow) { 
        discountRow.classList.add('hidden'); 
    }
    
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (itemsVisibles.length === 0) { 
        container.innerHTML = '<div class="text-center py-12"><i class="fas fa-shopping-bag text-5xl text-gray-300 mb-4"></i><p class="text-gray-400">Tu carrito está vacío</p></div>'; 
        return; 
    }
    
    container.innerHTML = itemsVisibles.map(item => `
        <div class="flex gap-4 mb-4 pb-4 border-b">
            <img src="${item.imagen || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=80'}" class="w-20 h-20 object-cover rounded-xl">
            <div class="flex-1">
                <h4 class="font-semibold">${item.categoria || ''} - ${item.nombre} ${item.colorNombre || ''}</h4>
                ${item.esPack ? `<p class="text-sm text-gray-500">Pack de ${item.productosIncluidos || (item.nombre.includes('3') ? 3 : 4)} productos</p>` : ''}
                <p class="text-[#4d4845] font-bold">$${item.precio.toLocaleString()}</p>
                ${item.talla && !item.esPack ? `<p class="text-xs text-gray-400">Talla: ${item.talla}</p>` : ''}
                <div class="flex items-center gap-3 mt-2">
                <button onclick="window.updateQty('${item.id}', ${item.cantidad-1}, '${item.talla || ''}', ${item.esPack})" class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200">-</button>
                <span class="text-sm font-bold w-6 text-center text-[#4d4845]">${item.cantidad}</span>
                <button onclick="window.updateQty('${item.id}', ${item.cantidad+1}, '${item.talla || ''}', ${item.esPack})" class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200">+</button>
                <button onclick="window.removeItem('${item.id}', '${item.talla || ''}', ${item.esPack})" class="ml-auto text-red-400 text-sm hover:text-red-600"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

window.updateQty = function(id, qty, talla, esPack) {
    console.log("updateQty llamado:", { id, qty, talla, esPack });
    id = id.toString(); // Asegurar que es string
    
    if (qty <= 0) { 
        window.removeItem(id, talla, esPack); 
        return; 
    }
    
    const item = cart.find(i => {
        const itemId = (i.id || i.ID).toString();
        if (esPack) {
            return itemId === id && i.esPack === true;
        } else {
            return itemId === id && i.talla === talla && !i.esPack;
        }
    });
    
    if (item) { 
        item.cantidad = qty; 
        saveCart(); 
        updateCartUI();
    } else {
        console.error("Item no encontrado:", { id, talla, esPack });
    }
};

window.removeItem = function(id, talla, esPack) {
    console.log("🗑️ Eliminando item:", { id, talla, esPack });
    id = id.toString();
    
    if (esPack) { 
        cart = cart.filter(i => (i.packId || i.id).toString() !== id);
    } else { 
        cart = cart.filter(i => {
            const itemId = (i.id || i.ID).toString();
            return !(itemId === id && i.talla === talla && !i.esPack);
        });
    }
    
    saveCart();
    updateCartUI();
    mostrarMensaje("✅ Producto eliminado del carrito", "success");
};

export function addToCart(productId, talla = null) {
    const user = getCurrentUser();
    if (!user) { 
        import('./auth.js').then(module => module.showRegisterModal()); 
        return; 
    }
    
    // Buscar producto por ID (mayúscula o minúscula)
    const p = productos.find(p => p.ID === productId || p.id === productId);
    if (!p) {
        console.error("Producto no encontrado:", productId);
        return;
    }
    
    const tallaUsar = talla || (p.TALLAS ? p.TALLAS[0] : (p.tallas ? p.tallas[0] : 'S/M'));
    const existing = cart.find(i => (i.ID === productId || i.id === productId) && i.talla === tallaUsar && !i.esPack);
    
    const precioFinal = (p.PRECIOOFERTA || p.precioOferta) ? (p.PRECIOOFERTA || p.precioOferta) : (p.PRECIO || p.precio);
    
    if (existing) {
        existing.cantidad++;
    } else {
        cart.push({ 
            ...p, 
            talla: tallaUsar, 
            cantidad: 1, 
            esPack: false,
            precio: precioFinal,
            precioOriginal: p.PRECIO || p.precio,
            nombre: p.NOMBRE || p.nombre,
            colorNombre: p.COLORNOMBRE || p.colorNombre,
            imagen: p.IMAGEN || p.imagen
        });
    }
    
    console.log('📦 Carrito después de agregar:', cart);
    saveCart();
    mostrarMensaje(`✨ ${p.NOMBRE || p.nombre} ${p.COLORNOMBRE || p.colorNombre} (${tallaUsar}) agregado`, "success");
}


export function addPackToCart(packData) {
    const user = getCurrentUser();
    if (!user) { 
        import('./auth.js').then(module => module.showRegisterModal()); 
        return; 
    }
    
    const packId = Date.now();
    
    // Guardar cada producto individual del pack con el packId
    packData.productosSeleccionados.forEach(prod => {
        cart.push({ 
            ...prod, 
            id: packId, 
            cantidad: 1, 
            esParteDePack: true, 
            packId: packId  // ← IMPORTANTE: mismo packId
        });
    });

    // Guardar el pack principal
    cart.push({ 
        id: packId, 
        nombre: `Pack ${packData.cantidad} Bodys`, 
        precio: packData.cantidad === 3 ? 99990 : 119990, 
        cantidad: 1, 
        esPack: true, 
        packId: packId,  // ← IMPORTANTE: mismo packId
        productosIncluidos: packData.cantidad,
        imagen: packData.cantidad === 3 ? 'https://i.postimg.cc/1XN3t1B3/Pack_3.png' : 'https://i.postimg.cc/vT6ZBwhm/Pack_4.png'
    });
    
    saveCart();
    mostrarMensaje(`🎉 Pack ${packData.cantidad} bodys agregado`, "success");
}

export function getDatosEnvioGuardados() {
    return JSON.parse(localStorage.getItem('lumaDatosEnvio')) || {};
}

export function guardarDatosEnvio(datos) {
    localStorage.setItem('lumaDatosEnvio', JSON.stringify(datos));
}

export function getResumenPedido() {
    const user = getCurrentUser();
    const itemsVisibles = cart.filter(item => !item.esParteDePack);
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    let descuento = 0;
    
    // Verificar si hay productos individuales (NO packs)
    const hayProductosIndividuales = itemsVisibles.some(item => !item.esPack);
    
    if (cuponAplicado && cuponInfo && !cuponInfo.usado) {
        descuento = subtotal * (cuponInfo.valor / 100);
    } else if (user && user.primeraCompra && !usedCoupon && hayProductosIndividuales) {
        descuento = subtotal * 0.3;
    }
    
    const total = subtotal - descuento + costoEnvio;
    return { subtotal, envio: costoEnvio, total, envioGratis };
}

export async function finalizarCompraConDatosEnvio(datos, numeroPedido) {
    console.log("🚀 INICIANDO finalizarCompraConDatosEnvio");
    
    const user = getCurrentUser();
    if (!user) {
        console.log("❌ Usuario no logueado");
        return;
    }
    console.log("✅ Usuario:", user.name);
    
    const itemsVisibles = cart.filter(item => !item.esParteDePack);
    console.log("📦 itemsVisibles:", itemsVisibles.length);
    
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    console.log("💰 Subtotal:", subtotal);
    
    let descuento = 0;
    const hayProductosIndividuales = itemsVisibles.some(item => !item.esPack);
    
    if (cuponAplicado && cuponInfo && !cuponInfo.usado) {
        descuento = subtotal * (cuponInfo.valor / 100);
    } else if (user.primeraCompra && !usedCoupon && hayProductosIndividuales) {
        descuento = subtotal * 0.3;
    }
    console.log("🏷️ Descuento:", descuento);
    
    const envioGratisCalc = subtotal >= UMBRAL_ENVIO_GRATIS;
    const costoEnvioActual = envioGratisCalc ? 0 : 17500;
    const total = subtotal - descuento + costoEnvioActual;
    console.log("📦 Envío:", costoEnvioActual);
    console.log("💰 Total:", total);
    
    // Guardar detalles de packs
    const itemsParaGuardar = itemsVisibles.map(item => {
        if (item.esPack) {
            const productosDelPack = cart.filter(i => i.packId === item.id && i.esParteDePack);
            return {
                ...item,
                productosIncluidosDetalle: productosDelPack.map(p => ({
                    nombre: p.nombre || p.NOMBRE,
                    colorNombre: p.colorNombre || p.COLORNOMBRE,
                    talla: p.talla,
                    cantidad: p.cantidad || 1
                }))
            };
        }
        return item;
    });
    
    const ventaData = {
        usuario: user.name,
        email: user.email,
        productos: itemsParaGuardar,
        subtotal: subtotal,
        descuento: descuento,
        cuponAplicado: cuponAplicado,
        envio: costoEnvioActual,
        total: total,
        metodoPago: "contraentrega",
        datosEnvio: datos,
        numeroPedido: numeroPedido,
        estadoEnvio: "confirmado",
        fecha: new Date().toISOString()
    };
    
    console.log("📝 ventaData preparada:", ventaData.numeroPedido);
    
    // Guardar en Firestore
    let ventaId = null;
    try {
        console.log("💾 Intentando guardar en Firestore...");
        ventaId = await guardarVentaFirestore(ventaData);
        console.log("✅ Venta guardada en Firestore con ID:", ventaId);
    } catch (error) {
        console.error("❌ Error guardando en Firestore:", error);
    }
    
    // Guardar en localStorage como respaldo
    let compras = JSON.parse(localStorage.getItem('lumaCompras')) || [];
    compras.push({ ...ventaData, idFirestore: ventaId || 'no-firestore' }); 
    localStorage.setItem('lumaCompras', JSON.stringify(compras));
    console.log("💾 Guardado en localStorage. Total compras:", compras.length);
    
    // ✅ LIMPIAR CARRITO COMPLETAMENTE
    cart = [];
    localStorage.removeItem('lumaCart');
    saveCart();
    console.log("🗑️ Carrito limpiado");
    
    // Mostrar modal de confirmación
    mostrarModalConfirmacion(user, itemsVisibles, subtotal, descuento, costoEnvioActual, total, datos);
    console.log("🔄 Modal mostrado");
    
    // Cerrar sidebar del carrito
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartSidebar) cartSidebar.classList.add('translate-x-full');
    if (cartOverlay) cartOverlay.classList.add('hidden');
    
    // Actualizar UI sin recargar
    updateCartUI();
    console.log("✅ Compra completada exitosamente");
}

function mostrarModalConfirmacion(user, productos, subtotal, descuento, envio, total, datos) {
    const modalHTML = `
        <div id="modalConfirmacion" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7);">
            <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div class="bg-[#4d4845] text-white p-4 rounded-t-3xl flex justify-between items-center">
                    <h2 class="text-xl font-bold flex items-center gap-2"><i class="fas fa-check-circle"></i> ¡Pedido Confirmado!</h2>
                    <button onclick="window.cerrarModalConfirmacion()" class="text-white hover:text-gray-200"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6">
                    <div class="text-center mb-6">
                        <p class="text-gray-600">Hola <strong>${user.name}</strong>, tu pedido ha sido confirmado exitosamente.</p>
                    </div>
                    
                    <div class="border-b pb-4 mb-4">
                        <h3 class="font-bold text-lg mb-3 flex items-center gap-2"><i class="fas fa-box text-[#7B7369]"></i> Resumen del pedido</h3>
                        <div class="space-y-2">
                            ${productos.map(p => `
                                <div class="flex justify-between text-sm">
                                    <span>${p.NOMBRE} ${p.COLORNOMBRE || ''} x${p.cantidad}</span>
                                    <span class="font-medium">$${(p.PRECIO * p.cantidad).toLocaleString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="bg-[#F2EBDC] p-4 rounded-xl mb-4">
                        <div class="flex justify-between text-sm mb-2">
                            <span>Subtotal:</span>
                            <span>$${subtotal.toLocaleString()}</span>
                        </div>
                        ${descuento > 0 ? `
                        <div class="flex justify-between text-sm text-green-600 mb-2">
                            <span>Descuento:</span>
                            <span>-$${descuento.toLocaleString()}</span>
                        </div>
                        ` : ''}
                        <div class="flex justify-between text-sm mb-2">
                            <span>Envío:</span>
                            <span>${envio === 0 ? '<span class="text-green-600">GRATIS</span>' : `$${envio.toLocaleString()}`}</span>
                        </div>
                        <div class="flex justify-between text-lg font-bold pt-2 border-t border-[#7B7369]">
                            <span>Total:</span>
                            <span class="text-[#7B7369]">$${total.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="bg-white border border-[#F2EBDC] rounded-xl p-4 mb-4">
                        <h3 class="font-bold text-sm mb-2 flex items-center gap-2"><i class="fas fa-map-marker-alt text-[#7B7369]"></i> Datos de entrega</h3>
                        <p class="text-sm">${datos.nombre} ${datos.apellido}</p>
                        <p class="text-sm">Cédula: ${datos.cedula}</p>
                        <p class="text-sm">Teléfono: ${datos.telefono}</p>
                        <p class="text-sm">${datos.direccion}, ${datos.ciudad}</p>
                        <p class="text-sm">${datos.tipoVivienda === 'apartamento' ? 'Apartamento' : datos.tipoVivienda === 'oficina' ? 'Oficina' : 'Casa'}</p>
                        ${datos.infoAdicional ? `<p class="text-sm text-gray-500 mt-1">Referencia: ${datos.infoAdicional}</p>` : ''}
                    </div>
                    
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <p class="text-sm text-green-800 flex items-center gap-2">
                            <i class="fas fa-truck"></i> 
                            <strong>Pago contra entrega</strong> - Total a pagar en efectivo al recibir: <strong>$${total.toLocaleString()}</strong>
                        </p>
                        <p class="text-xs text-green-600 mt-2">📞 Te contactaremos para coordinar la entrega.</p>
                    </div>
                    
                    <button onclick="window.cerrarModalConfirmacion()" class="btn-primary w-full py-3 text-sm font-semibold">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartSidebar) cartSidebar.classList.add('translate-x-full');
    if (cartOverlay) cartOverlay.classList.add('hidden');
}
// Exportar funciones necesarias

export function getCart() {
    return cart;
}

export { costoEnvio, envioGratis, UMBRAL_ENVIO_GRATIS };

window.getCart = getCart;
window.updateQty = updateQty;
window.removeItem = removeItem;
window.addToCart = addToCart;
window.addPackToCart = addPackToCart;
window.finalizarCompraConDatosEnvio = finalizarCompraConDatosEnvio;

// Agregar función global para cerrar el modal
window.cerrarModalConfirmacion = function() {
    const modal = document.getElementById('modalConfirmacion');
    if (modal) modal.remove();
};