import { enviarCorreoConfirmacion } from './email.js';
import { productos, colores, actualizarProductos } from './products.js';
import { addToCart, addPackToCart, updateCartUI, setUpdateCartUI, getDatosEnvioGuardados, guardarDatosEnvio, finalizarCompraConDatosEnvio, getCart } from './cart.js';
import { getCurrentUser, showRegisterModal } from './auth.js';
import { procesarPagoConEpayco } from './epayco.js';

let currentFilter = "todos";
let usedCoupon = localStorage.getItem('lumaCouponUsed') === 'true';
let packEnSeleccion = { cantidad: 0, productosSeleccionados: [] };
let cuponAplicado = localStorage.getItem('cuponAplicado') || null;
let cuponInfo = null;

// ✅ FORZAR ACTUALIZACIÓN DE usedCoupon POR EMAIL
const userActual = getCurrentUser();
if (userActual && userActual.email) {
    const descuentoUsadoPorEmail = localStorage.getItem(`luma_descuento_usado_${userActual.email}`) === 'true';
    if (descuentoUsadoPorEmail && !usedCoupon) {
        usedCoupon = true;
        localStorage.setItem('lumaCouponUsed', 'true');
    }
}

setUpdateCartUI(updateCartUI);

if (cuponAplicado) {
    const cupones = JSON.parse(localStorage.getItem('lumaCupones')) || {};
    cuponInfo = cupones[cuponAplicado] || null;
}

// ==================== NOTIFICACIONES MODERNAS ====================

function mostrarMensaje(mensaje, tipo = "error") {
    const notificacionAnterior = document.querySelector('.toast-notification');
    if (notificacionAnterior) notificacionAnterior.remove();
    
    const colores = {
        error: { bg: "#e74c3c", icono: "fa-exclamation-circle" },
        success: { bg: "#27ae60", icono: "fa-check-circle" },
        warning: { bg: "#f39c12", icono: "fa-info-circle" }
    };
    
    const color = colores[tipo] || colores.error;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification fixed top-24 right-4 z-50 transition-all duration-300 transform translate-x-full';
    toast.style.cssText = `background: ${color.bg}; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px; font-size: 14px; max-width: 350px; z-index: 1000;`;
    toast.innerHTML = `<i class="fas ${color.icono} text-lg"></i><span>${mensaje}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function mostrarErrorCampo(inputId, mensaje) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const errorAnterior = input.parentElement?.querySelector('.campo-error');
    if (errorAnterior) errorAnterior.remove();
    
    input.classList.add('border-red-500', 'bg-red-50');
    
    const errorMsg = document.createElement('p');
    errorMsg.className = 'campo-error text-red-500 text-xs mt-1 flex items-center gap-1';
    errorMsg.innerHTML = `<i class="fas fa-exclamation-circle text-xs"></i> ${mensaje}`;
    
    if (input.parentElement) input.parentElement.appendChild(errorMsg);
    
    setTimeout(() => {
        input.classList.remove('border-red-500', 'bg-red-50');
        if (errorMsg.parentElement) errorMsg.remove();
    }, 3000);
}

function limpiarErroresCampos() {
    document.querySelectorAll('.campo-error').forEach(el => el.remove());
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500', 'bg-red-50');
    });
}

// ==================== RENDERIZADO ====================

function renderProductosDestacados() {
    console.log("🖼️ Renderizando productos destacados...");
    console.log("Productos disponibles:", productos.length);
    
    // Si no hay productos cargados, esperar y reintentar
    if (productos.length === 0) {
        console.log("⏳ Productos no cargados aún, reintentando en 500ms...");
        setTimeout(() => renderProductosDestacados(), 500);
        return;
    }
    
    const destacados = productos.filter(p => p.DESTACADO === true);
    console.log("Productos destacados:", destacados.length);
    
    const container = document.getElementById('productosDestacados');
    if (!container) {
        console.error("❌ Contenedor 'productosDestacados' no encontrado");
        return;
    }
    
    if (destacados.length === 0) {
        container.innerHTML = '<p class="text-center text-[#7B7369] col-span-full">No hay productos destacados en este momento</p>';
        return;
    }
    
    container.innerHTML = destacados.map(p => `
        <div class="carrusel-slide">
            <div class="product-card group cursor-pointer" onclick="verProducto(${p.ID || p.id})">
                <div class="relative h-80 overflow-hidden bg-[#F9F6F0]">
                    <img src="${p.IMAGEN || p.imagen || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400'}" 
                         class="w-full h-full object-contain object-top group-hover:scale-105 transition duration-500"
                         onerror="this.src='https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400'">
                </div>
                <div class="p-5">
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold text-lg">${p.NOMBRE || p.nombre}</h3>
                        ${p.PRECIOOFERTA || p.precioOferta ? `
                            <span class="bg-[#F7EBEB] text-[#4d4845] text-xs px-2 py-0.5 rounded-full">-${Math.round((1 - (p.PRECIOOFERTA || p.precioOferta)/(p.PRECIO || p.precio)) * 100)}%</span>
                        ` : ''}
                    </div>
                    <p class="text-sm text-[#7B7369]">${p.COLORNOMBRE || p.colorNombre}</p>
                    <div class="flex items-center gap-2 flex-wrap mt-2">
                        ${p.PRECIOOFERTA || p.precioOferta ? `
                            <p class="text-[#7B7369] text-sm line-through">$${(p.PRECIO || p.precio).toLocaleString()}</p>
                            <p class="text-[#4d4845] font-bold text-xl">$${(p.PRECIOOFERTA || p.precioOferta).toLocaleString()}</p>
                        ` : `
                            <p class="text-[#4d4845] font-bold text-xl">$${(p.PRECIO || p.precio).toLocaleString()}</p>
                        `}
                    </div>
                    <button onclick="event.stopPropagation(); verProducto(${p.ID || p.id})" class="btn-primary w-full py-2 rounded-full font-semibold mt-3 text-sm">Ver producto</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Pequeño delay para asegurar que el DOM se actualizó
    setTimeout(() => {
        inicializarCarrusel();
    }, 100);
}

function renderFilters() {
    const container = document.getElementById('colorFilters');
    if (!container) return;
    
    const colorEstilosActivo = {
        'todos': 'bg-[#F5ECDC] text-[#1F1D20]',
        'marfil': 'bg-[#F5F0E8] text-[#4d4845]',
        'negro': 'bg-[#1A1A1A] text-white',
        'cocoa': 'bg-[#5C3A2E] text-white',
        'beige': 'bg-[#D7C9B2] text-[#4d4845]'
    };
    
    const colorEstilosHover = {
        'todos': 'hover:bg-[#1F1D20] hover:text-white hover:border-[#1F1D20]',
        'marfil': 'hover:bg-[#F5F0E8] hover:text-[#4d4845] hover:border-[#4d4845]',
        'negro': 'hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]',
        'cocoa': 'hover:bg-[#99705D] hover:text-white hover:border-[#4d4845]',
        'beige': 'hover:bg-[#D7C9B2] hover:text-[#4d4845] hover:border-[#4d4845]'
    };
    
    container.innerHTML = colores.map(c => {
        const estiloBase = 'px-5 py-2 rounded-full border-2 transition-all ';
        if (currentFilter === c.valor) {
            return `<button onclick="setFilter('${c.valor}')" class="${estiloBase} ${colorEstilosActivo[c.valor]}">${c.nombre}</button>`;
        } else {
            return `<button onclick="setFilter('${c.valor}')" class="${estiloBase} border-[#4d4845] text-[#4d4845] bg-transparent ${colorEstilosHover[c.valor]}">${c.nombre}</button>`;
        }
    }).join('');
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const filtered = currentFilter === "todos" ? productos : productos.filter(p => p.COLOR === currentFilter);
    grid.innerHTML = filtered.map(p => `
        <div class="product-card group cursor-pointer" onclick="verProducto(${p.ID})">
            <div class="relative h-80 overflow-hidden bg-[#F9F6F0]">
                <img src="${p.IMAGEN}" class="w-full h-full object-contain object-top group-hover:scale-105 transition duration-500">
            </div>
            <div class="p-5">
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-lg">${p.NOMBRE}</h3>
                    ${p.PRECIOOFERTA ? `
                        <span class="bg-[#F7EBEB] text-[#4d4845] text-xs px-2 py-0.5 rounded-full">-${Math.round((1 - p.PRECIOOFERTA/p.PRECIO) * 100)}%</span>
                    ` : ''}
                </div>
                <p class="text-sm text-[#7B7369]">${p.COLORNOMBRE}</p>
                <p class="text-[8px] md:text-[9px] text-gray-400 mt-1">SKU: ${p.SKU || 'Cargando...'}</p>
                <div class="flex items-center gap-2 flex-wrap mt-2">
                    ${p.PRECIOOFERTA ? `
                        <p class="text-[#7B7369] text-sm line-through">$${p.PRECIO.toLocaleString()}</p>
                        <p class="text-[#4d4845] font-bold text-xl">$${p.PRECIOOFERTA.toLocaleString()}</p>
                    ` : `
                        <p class="text-[#4d4845] font-bold text-xl">$${p.PRECIO.toLocaleString()}</p>
                    `}
                </div>
                <button onclick="event.stopPropagation(); verProducto(${p.ID})" class="btn-primary w-full py-2 rounded-full font-semibold mt-3 text-sm">Ver producto</button>
            </div>
        </div>
    `).join('');
}

// ==================== PESTAÑAS ====================

window.showTab = function(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    const tabId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    const tabElement = document.getElementById(tabId);
    if (tabElement) tabElement.classList.remove('hidden');
    
    if (tab === 'inicio') renderProductosDestacados();
    if (tab === 'productos') renderProducts();
    if (tab === 'misCompras') cargarHistorialCompras();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function cargarHistorialCompras() {
    const user = getCurrentUser();
    if (!user) {
        document.getElementById('historialCompras').innerHTML = '<div class="text-center py-12"><i class="fas fa-sign-in-alt text-5xl text-gray-300 mb-4"></i><p class="text-gray-400">Inicia sesión para ver tus compras</p></div>';
        return;
    }
    
    const compras = JSON.parse(localStorage.getItem('lumaCompras')) || [];
    const misCompras = compras.filter(c => c.usuario === user.name || c.email === user.email);
    
    const container = document.getElementById('historialCompras');
    if (!container) return;
    
    if (misCompras.length === 0) {
        container.innerHTML = '<div class="text-center py-12"><i class="fas fa-receipt text-5xl text-gray-300 mb-4"></i><p class="text-gray-400">No has realizado compras aún</p></div>';
        return;
    }
    
    container.innerHTML = misCompras.reverse().map(compra => {
        let productos = compra.productos || [];
        const itemsMostrar = productos.filter(item => !item.esParteDePack);
        const numeroPedido = compra.numeroPedido || 'LUMA-' + compra.id;
        
        return `
        <div class="bg-white rounded-xl shadow-md p-4 border border-[#F2EBDC] mb-4">
            <div class="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div>
                    <span class="text-sm text-gray-500">${new Date(compra.fecha).toLocaleDateString()}</span>
                    <p class="font-bold">Total: $${(compra.total || 0).toLocaleString()}</p>
                </div>
                <div class="flex gap-2">
                    ${compra.descuento > 0 ? '<span class="text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full">🎉 Descuento aplicado</span>' : ''}
                    ${compra.estado === 'Pagado' ? '<span class="text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full">✅ Pagado</span>' : ''}
                </div>
            </div>
            <div class="border-t pt-3 border-[#F2EBDC]">
                <p class="text-sm font-semibold mb-2">Productos:</p>
                <div class="flex flex-wrap gap-2">
                    ${itemsMostrar.map(item => {
                        if (item.esPack) {
                            return `
                                <div class="text-xs bg-[#F2EBDC] px-3 py-2 rounded-lg w-full mb-2">
                                    <p class="font-semibold">📦 ${item.nombre}</p>
                                    <p class="text-gray-600 mt-1">Incluye:</p>
                                    <ul class="list-disc list-inside ml-2">
                                        ${(item.productosIncluidosDetalle || []).map(prod => `
                                            <li>${prod.nombre} - ${prod.colorNombre} (${prod.talla}) x${prod.cantidad || 1}</li>
                                        `).join('')}
                                    </ul>
                                </div>
                            `;
                        }
                        return `
                            <span class="text-xs bg-[#F9F6F0] px-2 py-1 rounded-full">
                                ${item.nombre || item.NOMBRE || 'Producto'} 
                                ${item.colorNombre || item.COLORNOMBRE || ''} 
                                ${item.talla ? `(${item.talla})` : ''} 
                                x${item.cantidad || 1}
                            </span>
                        `;
                    }).join('')}
                </div>
                <div class="flex justify-between items-center mt-3 flex-wrap gap-2">
                    <p class="text-xs text-gray-400">🔖 N° Pedido: ${numeroPedido}</p>
                    <button onclick="solicitarCambio('${numeroPedido}')" 
                            class="bg-[#7B7369] hover:bg-[#4D4845] text-white text-xs px-3 py-1.5 rounded-full transition flex items-center gap-1">
                        <i class="fas fa-exchange-alt"></i> Realizar cambio
                    </button>
                </div>
                ${compra.metodoPago ? `<p class="text-xs text-gray-400 mt-1">💳 Pago: ${compra.metodoPago === 'contraentrega' ? 'Contra entrega' : 'Tarjeta (ePayco)'}</p>` : ''}
            </div>
        </div>
    `}).join('');
}

window.setFilter = function(color) { currentFilter = color; renderFilters(); renderProducts(); };

// ==================== PACKS ====================

// ==================== PACKS ====================

// ==================== VARIABLES PARA PACK MEJORADO ====================
let packCantidadActual = 0;
let packProductosTemp = [];
let colorSeleccionadoPack = null;
let tallaSeleccionadaPack = null;
let referenciaSeleccionada = null;

function obtenerProductoPorReferenciaYColor(referencia, colorNombre) {
    const colorMap = {
        'MARFIL': 'marfil',
        'NEGRO': 'negro',
        'COCOA': 'cocoa',
        'BEIGE': 'beige'
    };
    const colorValue = colorMap[colorNombre];
    return productos.find(p => p.NOMBRE === referencia && p.COLOR === colorValue);
}

function actualizarVistaPrevia() {
    const referencia = document.getElementById('selectReferencia')?.value;
    const color = document.getElementById('selectColor')?.value;
    const previewImg = document.getElementById('previewImg');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    
    if (referencia && color && previewImg && previewPlaceholder) {
        const producto = obtenerProductoPorReferenciaYColor(referencia, color);
        if (producto && producto.IMAGEN) {
            previewImg.src = producto.IMAGEN;
            previewImg.classList.remove('hidden');
            previewImg.style.objectFit = 'contain';
            previewImg.classList.add('cursor-pointer');
            previewImg.onclick = () => verImagenPack(producto.IMAGEN);
            previewPlaceholder.classList.add('hidden');
            return;
        }
    }
    if (previewImg) previewImg.classList.add('hidden');
    if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');
}

window.seleccionarColor = function(color, bgColor) {
    colorSeleccionadoPack = color;
    const colorInput = document.getElementById('selectColor');
    if (colorInput) colorInput.value = color;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-[#7B7369]', 'scale-105');
    });
    if (event && event.target) event.target.classList.add('ring-2', 'ring-[#7B7369]', 'scale-105');
    actualizarVistaPrevia();
};

window.seleccionarTallaPack = function(talla) {
    console.log("🔵 Función seleccionarTallaPack llamada con:", talla);
    
    tallaSeleccionadaPack = talla;
    
    const tallaInput = document.getElementById('selectTalla');
    if (tallaInput) tallaInput.value = talla;
    
    const todosLosBotones = document.querySelectorAll('.talla-pack-btn');
    
    // Resetear todos los botones a estado NO seleccionado
    todosLosBotones.forEach(btn => {
        btn.classList.remove('bg-[#F5ECDC]', 'text-[#4d4845]');
        btn.classList.add('bg-white', 'text-[#4d4845]', 'border', 'border-[#7B7369]');
    });
    
    const idBoton = `tallaPack_${talla}`;
    const btnSeleccionado = document.getElementById(idBoton);
    
    if (btnSeleccionado) {
        // Estado SELECCIONADO
        btnSeleccionado.classList.remove('bg-white', 'text-[#4d4845]');
        btnSeleccionado.classList.add('bg-[#F5ECDC]', 'text-[#4d4845]');
        console.log("✅ Estilos aplicados al botón:", talla);
    } else {
        console.error("❌ No se encontró el botón con ID:", idBoton);
    }
};

window.agregarProductoAlPack = function() {
    const referencia = document.getElementById('selectReferencia')?.value;
    const color = document.getElementById('selectColor')?.value;
    const talla = document.getElementById('selectTalla')?.value;
    
    if (!referencia) {
        mostrarMensaje('Selecciona una referencia', 'warning');
        return;
    }
    if (!color) {
        mostrarMensaje('Selecciona un color', 'warning');
        return;
    }
    if (!talla) {
        mostrarMensaje('Selecciona una talla', 'warning');
        return;
    }
    
    const producto = obtenerProductoPorReferenciaYColor(referencia, color);
    if (!producto) {
        mostrarMensaje('Producto no encontrado', 'error');
        return;
    }
    
    if (packProductosTemp.length >= packCantidadActual) {
        mostrarMensaje(`Ya seleccionaste ${packCantidadActual} productos. Completa el pack o elimina uno.`, 'warning');
        return;
    }
    
    const existe = packProductosTemp.find(p => p.referencia === referencia && p.color === color && p.talla === talla);
    if (existe) {
        mostrarMensaje('Este producto ya fue agregado', 'warning');
        return;
    }
    
    packProductosTemp.push({
        id: producto.ID,
        referencia: referencia,
        color: color,
        talla: talla,
        nombre: producto.NOMBRE,
        colorNombre: producto.COLORNOMBRE,
        imagen: producto.IMAGEN,
        categoria: producto.CATEGORIA || 'BODY',
        precio: producto.PRECIOOFERTA || producto.PRECIO
    });
    
    actualizarListaPack();
    limpiarSeleccionPack();
};

function limpiarSeleccionPack() {
    const selectRef = document.getElementById('selectReferencia');
    const selectColor = document.getElementById('selectColor');
    const selectTalla = document.getElementById('selectTalla');
    if (selectRef) selectRef.value = '';
    if (selectColor) selectColor.value = '';
    if (selectTalla) selectTalla.value = '';
    colorSeleccionadoPack = null;
    tallaSeleccionadaPack = null;
    referenciaSeleccionada = null;
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-[#7B7369]', 'scale-105');
    });
    document.querySelectorAll('.talla-pack-btn').forEach(btn => {
        btn.classList.remove('bg-[#7B7369]', 'text-white');
        btn.classList.add('border-[#7B7369]', 'text-[#7B7369]');
    });
    actualizarVistaPrevia();
}

function actualizarListaPack() {
    const container = document.getElementById('packProductosList');
    const totalSpan = document.getElementById('packTotal');
    const btnConfirmar = document.getElementById('confirmarPackBtn');
    const packTotal = packCantidadActual === 3 ? 99990 : 119990;
    const seleccionados = packProductosTemp.length;
    
    // ✅ ACTUALIZAR CONTADORES (nuevo)
    const packSeleccionadosSpan = document.getElementById('packSeleccionados');
    const packRequeridosSpan = document.getElementById('packRequeridos');
    const packContadorSpan = document.getElementById('packContador');
    
    if (packSeleccionadosSpan) packSeleccionadosSpan.innerText = seleccionados;
    if (packRequeridosSpan) packRequeridosSpan.innerText = packCantidadActual;
    if (packContadorSpan) packContadorSpan.innerText = `${seleccionados}/${packCantidadActual}`;
    
    if (!container) return;
    
    if (packProductosTemp.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 py-8">
            <i class="fas fa-inbox text-4xl mb-2"></i>
            <p class="text-sm">No hay productos seleccionados</p>
            <p class="text-xs mt-1">Agrega productos usando el panel de la izquierda</p>
        </div>`;
        if (totalSpan) totalSpan.innerText = `$${packTotal.toLocaleString()}`;
        if (btnConfirmar) {
            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = `<i class="fas fa-cart-plus mr-2"></i> Agregar al carrito (0/${packCantidadActual})`;
        }
        return;
    }
    
    container.innerHTML = packProductosTemp.map((p, idx) => `
        <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#F2EBDC]">
            <img src="${p.imagen}" class="w-12 h-12 object-contain rounded-lg bg-[#F9F6F0] cursor-pointer hover:opacity-80 transition" onclick="verImagenPack('${p.imagen}')">   
            <div class="flex-1">
                <h4 class="font-semibold text-sm">${p.categoria} - ${p.referencia} ${p.color}</h4>
                <p class="text-xs text-gray-500">Talla: ${p.talla}</p>
            </div>
            <button onclick="eliminarProductoDelPack(${idx})" class="text-red-400 hover:text-red-600">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
    
    if (totalSpan) totalSpan.innerText = `$${packTotal.toLocaleString()}`;
    if (btnConfirmar) {
        btnConfirmar.disabled = seleccionados !== packCantidadActual;
        btnConfirmar.innerHTML = `<i class="fas fa-cart-plus mr-2"></i> Agregar al carrito (${seleccionados}/${packCantidadActual})`;
    }
}

window.eliminarProductoDelPack = function(index) {
    packProductosTemp.splice(index, 1);
    actualizarListaPack();
};

window.abrirSelectorPack = function(cantidad) {
    const user = getCurrentUser();
    if (!user) { showRegisterModal(); return; }
    
    packCantidadActual = cantidad;
    packProductosTemp = [];
    colorSeleccionadoPack = null;
    tallaSeleccionadaPack = null;
    referenciaSeleccionada = null;
    
    const modalTitle = document.getElementById('packModalTitle');
    const packTotal = document.getElementById('packTotal');
    if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-boxes mr-2"></i> Pack ${cantidad} Bodys - Selecciona ${cantidad} productos`;
    if (packTotal) packTotal.innerText = `$${(cantidad === 3 ? 99990 : 119990).toLocaleString()}`;
    
    actualizarListaPack();
    limpiarSeleccionPack();
    
    const modal = document.getElementById('packModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.cerrarPackModal = function() {
    const modal = document.getElementById('packModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// ==================== EVENTOS DEL CARRITO ====================

document.getElementById('cartBtn')?.addEventListener('click', () => {
    document.getElementById('cartSidebar')?.classList.remove('translate-x-full');
    document.getElementById('cartOverlay')?.classList.remove('hidden');
});
document.getElementById('closeCart')?.addEventListener('click', () => {
    document.getElementById('cartSidebar')?.classList.add('translate-x-full');
    document.getElementById('cartOverlay')?.classList.add('hidden');
});
document.getElementById('cartOverlay')?.addEventListener('click', () => {
    document.getElementById('cartSidebar')?.classList.add('translate-x-full');
    document.getElementById('cartOverlay')?.classList.add('hidden');
});

// Dropdown usuario
document.getElementById('userMenuBtn')?.addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('hidden');
});
document.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.add('hidden');
});

// ==================== LIGHTBOX (IMAGEN AMPLIADA) ====================

let lightboxImagenes = [];
let lightboxIndexActual = 0;

window.abrirLightbox = function(imagenes, indexInicial) {
    lightboxImagenes = imagenes;
    lightboxIndexActual = indexInicial;
    
    const lightbox = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImage');
    const counter = document.getElementById('lightboxCounter');
    
    if (lightboxImg) lightboxImg.src = lightboxImagenes[lightboxIndexActual];
    
    if (counter) {
        counter.innerText = `${lightboxIndexActual + 1} / ${lightboxImagenes.length}`;
    }
    
    if (lightbox) {
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
    }
    document.body.style.overflow = 'hidden';
};

window.cerrarLightbox = function() {
    const lightbox = document.getElementById('lightboxModal');
    if (lightbox) {
        lightbox.classList.add('hidden');
        lightbox.classList.remove('flex');
    }
    document.body.style.overflow = '';
};

window.cambiarImagenLightbox = function(direccion) {
    lightboxIndexActual += direccion;
    
    if (lightboxIndexActual < 0) {
        lightboxIndexActual = lightboxImagenes.length - 1;
    }
    if (lightboxIndexActual >= lightboxImagenes.length) {
        lightboxIndexActual = 0;
    }
    
    const lightboxImg = document.getElementById('lightboxImage');
    const counter = document.getElementById('lightboxCounter');
    
    if (lightboxImg) lightboxImg.src = lightboxImagenes[lightboxIndexActual];
    
    if (counter) {
        counter.innerText = `${lightboxIndexActual + 1} / ${lightboxImagenes.length}`;
    }
};


// ==================== MODAL DE PRODUCTO - VERSIÓN CORREGIDA ====================

window.verProducto = function(productId) {
    console.log("verProducto llamado con ID:", productId);
    
    // Asegurar que productos esté cargado
    if (!productos || productos.length === 0) {
        console.log("Esperando carga de productos...");
        setTimeout(() => window.verProducto(productId), 500);
        return;
    }
    
    // Buscar por ID (número) o por id (string de Firestore)
    const product = productos.find(p => p.ID === productId || p.id === productId || p.ID == productId);
    
    if (!product) {
        console.error("Producto no encontrado:", productId);
        console.log("Productos disponibles:", productos.map(p => ({ ID: p.ID, id: p.id, NOMBRE: p.NOMBRE })));
        return;
    }
    
    console.log("Producto encontrado:", product.NOMBRE);
    console.log("IMAGEN del producto:", product.IMAGEN);
    
    // Obtener propiedades
    const nombre = product.NOMBRE || product.nombre;
    const colorNombre = product.COLORNOMBRE || product.colorNombre;
    const precio = product.PRECIO || product.precio;
    const precioOferta = product.PRECIOOFERTA || product.precioOferta;
    const imagen = product.IMAGEN || product.imagen || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400";
    const imagenes = product.IMAGENES || product.imagenes || [imagen];
    const descripcion = product.DESCRIPCION || product.descripcion || "Prenda confeccionada con materiales de alta calidad.";
    const tallas = product.TALLAS || product.tallas || ["S/M", "L/XL"];
    const sku = product.SKU || product.sku || `SKU-${product.ID || product.id}`;
    const id = product.ID || product.id;
    
    let tallasArray = Array.isArray(tallas) ? tallas : ["S/M", "L/XL"];
    let tallaSeleccionada = tallasArray[0];
    let cantidadSeleccionada = 1;
    let imagenActual = 0;
    let imagenesArray = Array.isArray(imagenes) && imagenes.length > 0 ? imagenes : [imagen];
    
    function seleccionarTalla(talla) {
        tallaSeleccionada = talla;
        const botones = document.querySelectorAll('#productModalContent .talla-modal-btn');
        botones.forEach(btn => {
            if (btn.innerText === talla) {
                btn.classList.remove('bg-white', 'text-[#4d4845]');
                btn.classList.add('bg-[#F5ECDC]', 'text-[#4d4845]');
            } else {
                btn.classList.remove('bg-[#F5ECDC]', 'text-[#4d4845]');
                btn.classList.add('bg-white', 'text-[#4d4845]');
            }
        });
    }
    
    function renderModal() {
    const modalContent = document.getElementById('productModalContent');
    if (!modalContent) return;
    
    const primeraImagen = imagenesArray[0] || imagen;
    
    modalContent.innerHTML = `
        <div class="grid md:grid-cols-2 gap-4 md:gap-6">
            <div>
                <div class="relative">
                    <img id="modalImagenPrincipal" src="${primeraImagen}" 
                         class="w-full h-auto max-h-[50vh] md:max-h-96 object-contain rounded-2xl cursor-pointer bg-[#F9F6F0]"
                         onclick="abrirLightbox(window.imagenesActualesModal, window.imagenActualIndexModal)">
                    
                    ${imagenesArray.length > 1 ? `
                        <button onclick="cambiarImagenModal(-1)" class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white z-10 shadow-md">‹</button>
                        <button onclick="cambiarImagenModal(1)" class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white z-10 shadow-md">›</button>
                    ` : ''}
                </div>
                
                ${imagenesArray.length > 1 ? `
                    <div class="flex gap-2 mt-3 overflow-x-auto pb-2">
                        ${imagenesArray.map((img, idx) => `
                            <img src="${img}" class="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl cursor-pointer border-2 flex-shrink-0 ${idx === imagenActual ? 'border-[#4d4845]' : 'border-transparent'} hover:opacity-80 transition" 
                                 onclick="cambiarImagenModalA(${idx})">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div>
                <h2 class="text-2xl md:text-3xl font-bold">${nombre}</h2>
                <p class="text-[#7B7369] text-sm md:text-base mt-1">${colorNombre}</p>
                <p class="text-[10px] text-gray-400 mt-1">SKU: ${sku}</p>
                <div class="mt-4">
                    ${precioOferta ? `
                        <div class="flex items-center gap-3 flex-wrap">
                            <p class="text-[#7B7369] text-lg md:text-xl line-through">$${precio.toLocaleString()}</p>
                            <p class="text-2xl md:text-3xl font-bold text-[#4d4845]">$${precioOferta.toLocaleString()}</p>
                            <span class="bg-[#F7EBEB] text-[#4d4845] text-xs md:text-sm px-2 py-1 rounded-full">-${Math.round((1 - precioOferta/precio) * 100)}%</span>
                        </div>
                    ` : `
                        <p class="text-2xl md:text-3xl font-bold text-[#4d4845]">$${precio.toLocaleString()}</p>
                    `}
                </div>
                <div class="mt-4">
                    <p class="text-[#7B7369] text-sm md:text-base">${descripcion}</p>
                </div>
                <div class="mt-6">
                    <p class="font-semibold mb-2">Talla:</p>
                    <div class="flex gap-2 md:gap-3 flex-wrap">
                        ${tallasArray.map(t => `
                            <button onclick="seleccionarTallaModal('${t}')" class="talla-modal-btn w-14 md:w-16 py-2 rounded-full border border-[#7B7369] ${tallaSeleccionada === t ? 'bg-[#F5ECDC] text-[#4d4845]' : 'bg-white text-[#4d4845]'}">
                                ${t}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="mt-6">
                    <p class="font-semibold mb-2">Cantidad:</p>
                    <div class="flex items-center gap-3">
                        <button onclick="cambiarCantidadModal(-1)" class="w-8 h-8 rounded-full bg-gray-100">-</button>
                        <span id="modalCantidad" class="text-xl font-semibold w-12 text-center">${cantidadSeleccionada}</span>
                        <button onclick="cambiarCantidadModal(1)" class="w-8 h-8 rounded-full bg-gray-100">+</button>
                    </div>
                </div>
                <button onclick="agregarAlCarritoDesdeModal()" class="btn-primary w-full py-3 rounded-full font-semibold mt-6">Agregar al carrito</button>
            </div>
        </div>
    `;
    
    // Guardar referencias para el lightbox
    window.imagenesActualesModal = imagenesArray;
    window.imagenActualIndexModal = imagenActual;
}
    
    window.modalState = {
        productId: id,
        talla: tallaSeleccionada,
        cantidad: cantidadSeleccionada,
        product: product,
        seleccionarTalla: seleccionarTalla,
        renderModal: renderModal
    };
    
    renderModal();
    
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
};

window.cerrarProductModal = function() {
    console.log("🔴 Cerrando modal de producto");
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
    
    // Limpiar el contenido del modal
    const modalContent = document.getElementById('productModalContent');
    if (modalContent) {
        modalContent.innerHTML = '';
    }
    
    // Limpiar el estado COMPLETAMENTE
    window.modalState = null;
    window.imagenesActualesModal = null;
    window.imagenActualIndexModal = null;
    
    document.body.style.overflow = '';
};

// Función global para cerrar (para onclick en HTML)
function cerrarProductModal() {
    window.cerrarProductModal();
}

// Funciones auxiliares para el modal
window.seleccionarTallaModal = function(talla) {
    if (window.modalState && window.modalState.seleccionarTalla) {
        window.modalState.seleccionarTalla(talla);
        window.modalState.talla = talla;
    }
};

window.cambiarCantidadModal = function(delta) {
    if (window.modalState) {
        const nuevaCantidad = window.modalState.cantidad + delta;
        if (nuevaCantidad >= 1 && nuevaCantidad <= 10) {
            window.modalState.cantidad = nuevaCantidad;
            const modalCantidad = document.getElementById('modalCantidad');
            if (modalCantidad) modalCantidad.innerText = nuevaCantidad;
        }
    }
};

window.cambiarImagenModal = function(direccion) {
    if (window.modalState && window.modalState.imagenes) {
        let nuevaImagen = window.modalState.imagenActual + direccion;
        if (nuevaImagen >= 0 && nuevaImagen < window.modalState.imagenes.length) {
            window.modalState.imagenActual = nuevaImagen;
            window.imagenActualIndexModal = nuevaImagen;
            const imgPrincipal = document.getElementById('modalImagenPrincipal');
            if (imgPrincipal) imgPrincipal.src = window.modalState.imagenes[nuevaImagen];
            
            // Actualizar borde de miniaturas
            const miniaturas = document.querySelectorAll('#productModalContent .flex.gap-2 img');
            miniaturas.forEach((img, i) => {
                if (i === nuevaImagen) {
                    img.classList.add('border-[#4d4845]', 'border-2');
                    img.classList.remove('border-transparent');
                } else {
                    img.classList.remove('border-[#4d4845]', 'border-2');
                    img.classList.add('border-transparent');
                }
            });
        }
    }
};

window.cambiarImagenModalA = function(idx) {
    if (window.modalState && window.modalState.imagenes && idx < window.modalState.imagenes.length) {
        window.modalState.imagenActual = idx;
        window.imagenActualIndexModal = idx;
        const imgPrincipal = document.getElementById('modalImagenPrincipal');
        if (imgPrincipal) imgPrincipal.src = window.modalState.imagenes[idx];
        
        // Actualizar borde de miniaturas
        const miniaturas = document.querySelectorAll('#productModalContent .flex.gap-2 img');
        miniaturas.forEach((img, i) => {
            if (i === idx) {
                img.classList.add('border-[#4d4845]', 'border-2');
                img.classList.remove('border-transparent');
            } else {
                img.classList.remove('border-[#4d4845]', 'border-2');
                img.classList.add('border-transparent');
            }
        });
    }
};

window.agregarAlCarritoDesdeModal = function() {
    console.log("agregarAlCarritoDesdeModal llamado");
    
    if (!window.modalState) {
        mostrarMensaje("Error: No se pudo agregar el producto. Intenta de nuevo.", "error");
        return;
    }
    
    if (!window.modalState.product) {
        mostrarMensaje("Error: Producto no encontrado.", "error");
        return;
    }
    
    const product = window.modalState.product;
    const talla = window.modalState.talla;
    const cantidad = window.modalState.cantidad;
    const productId = window.modalState.productId;
    
    console.log("Agregando:", product.NOMBRE || product.nombre, "Talla:", talla, "Cantidad:", cantidad);
    
    for (let i = 0; i < cantidad; i++) {
        addToCart(productId, talla);
    }
    
    // Cerrar el modal Y limpiar estado
    window.cerrarProductModal();
    
    mostrarMensaje(`✨ ${(product.NOMBRE || product.nombre)} agregado al carrito`, "success");
};

// ==================== MODAL DE ENVÍO (CORREGIDO) ====================

function abrirModalEnvio() {
    const datosGuardados = getDatosEnvioGuardados();
    
    if (datosGuardados) {
        document.getElementById('envioNombre').value = datosGuardados.nombre || '';
        document.getElementById('envioApellido').value = datosGuardados.apellido || '';
        document.getElementById('envioCedula').value = datosGuardados.cedula || '';
        document.getElementById('envioTelefono').value = datosGuardados.telefono || '';
        document.getElementById('envioCiudad').value = datosGuardados.ciudad || '';
        document.getElementById('envioDireccion').value = datosGuardados.direccion || '';
        document.getElementById('envioTipoVivienda').value = datosGuardados.tipoVivienda || 'casa';
        document.getElementById('envioInfoAdicional').value = datosGuardados.infoAdicional || '';
    }
      
// ✅ CORREGIDO: Usar getCart() en lugar de cart
    const carritoActual = getCart();
    const itemsVisibles = carritoActual.filter(item => !item.esParteDePack);
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    
    let descuento = 0;
    const user = getCurrentUser();
    
    // Verificar si hay productos individuales (NO packs)
    const hayProductosIndividuales = itemsVisibles.some(item => !item.esPack);
    
    // Verificar si el usuario ya usó el descuento (por email)
    let descuentoYaUsado = false;
    if (user && user.email) {
        descuentoYaUsado = localStorage.getItem(`luma_descuento_usado_${user.email}`) === 'true';
    }
    
    if (cuponAplicado && cuponInfo && !cuponInfo.usado) {
        descuento = subtotal * (cuponInfo.valor / 100);
    } else if (user && hayProductosIndividuales && !descuentoYaUsado && !usedCoupon) {
        descuento = subtotal * 0.3;
    }
    
    const envioGratisCalc = subtotal >= 99990;
    const envio = envioGratisCalc ? 0 : 17500;
    const total = subtotal - descuento + envio;
    
    document.getElementById('resumenSubtotal').innerText = `$${subtotal.toLocaleString()}`;
    document.getElementById('resumenEnvio').innerText = envio === 0 ? 'GRATIS' : `$${envio.toLocaleString()}`;
    document.getElementById('resumenTotal').innerText = `$${total.toLocaleString()}`;
    
    document.getElementById('modalEnvio').classList.remove('hidden');
    document.getElementById('modalEnvio').classList.add('flex');
    
    setTimeout(() => {
        const mapaContainer = document.getElementById('mapaContainer');
        if (mapaContainer) {
            mapaContainer.classList.remove('hidden');
            if (!window.google) {
                iniciarMapa();
            } else {
                const direccion = document.getElementById('envioDireccion').value;
                if (direccion && typeof buscarDireccion === 'function') {
                    buscarDireccion();
                }
            }
        }
    }, 300);
}

function cerrarModalEnvio() {
    document.getElementById('modalEnvio').classList.add('hidden');
    document.getElementById('modalEnvio').classList.remove('flex');
    const mapaContainer = document.getElementById('mapaContainer');
    if (mapaContainer) mapaContainer.classList.add('hidden');
}

// ==================== CONFIRMACIÓN ANTES DE FINALIZAR (CORREGIDO) ====================

function mostrarConfirmacionAntesDeFinalizar(datos) {
    // ✅ CORREGIDO: Usar getCart() en lugar de cart
    const carritoActual = getCart();
    const itemsVisibles = carritoActual.filter(item => !item.esParteDePack);
    const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    
    let descuento = 0;
    const user = getCurrentUser();
    
    // Verificar si hay productos individuales (NO packs)
    const hayProductosIndividuales = itemsVisibles.some(item => !item.esPack);
    
    // Verificar si el usuario ya usó el descuento (por email)
    let descuentoYaUsado = false;
    if (user && user.email) {
        descuentoYaUsado = localStorage.getItem(`luma_descuento_usado_${user.email}`) === 'true';
    }
    
    if (cuponAplicado && cuponInfo && !cuponInfo.usado) {
        descuento = subtotal * (cuponInfo.valor / 100);
    } else if (user && hayProductosIndividuales && !descuentoYaUsado && !usedCoupon) {
        descuento = subtotal * 0.3;
    }
    
    const envioGratisCalc = subtotal >= 99990;
    const envio = envioGratisCalc ? 0 : 17500;
    const total = subtotal - descuento + envio;
    
    const productosHTML = itemsVisibles.map(item => `
        <div class="flex justify-between text-sm py-1">
            <span>${item.nombre} ${item.colorNombre || ''} ${item.talla ? `(Talla ${item.talla})` : ''} x${item.cantidad}</span>
            <span>$${(item.precio * item.cantidad).toLocaleString()}</span>
        </div>
    `).join('');
    
    const confirmHTML = `
        <div id="modalConfirmacionPrevia" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7);">
            <div class="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
                <h2 class="text-xl font-bold mb-4">Confirmar pedido</h2>
                <p class="text-sm text-gray-600 mb-4">Revisa los detalles antes de confirmar</p>
                
                <div class="bg-[#F2EBDC] p-3 rounded-xl mb-4">
                    <p class="text-sm font-semibold mb-2">📦 Productos:</p>
                    <div class="border-b pb-2 mb-2">${productosHTML}</div>
                    <div class="flex justify-between text-sm pt-1"><span>Subtotal:</span><span>$${subtotal.toLocaleString()}</span></div>
                    ${descuento > 0 ? `<div class="flex justify-between text-sm text-green-600"><span>Descuento:</span><span>-$${descuento.toLocaleString()}</span></div>` : ''}
                    <div class="flex justify-between text-sm"><span>Envío:</span><span>${envio === 0 ? 'GRATIS' : `$${envio.toLocaleString()}`}</span></div>
                    <div class="flex justify-between text-lg font-bold pt-2 border-t border-[#7B7369] mt-2"><span>Total:</span><span class="text-[#7B7369]">$${total.toLocaleString()}</span></div>
                </div>
                
                <div class="bg-white border border-[#F2EBDC] rounded-xl p-3 mb-4">
                    <p class="text-sm font-semibold mb-2">📍 Datos de entrega:</p>
                    <p class="text-sm"><strong>${datos.nombre} ${datos.apellido}</strong></p>
                    <p class="text-sm">Cédula: ${datos.cedula}</p>
                    <p class="text-sm">Teléfono: ${datos.telefono}</p>
                    <p class="text-sm">Dirección: ${datos.direccion}, ${datos.ciudad}</p>
                    <p class="text-sm">Tipo: ${datos.tipoVivienda === 'apartamento' ? 'Apartamento' : datos.tipoVivienda === 'oficina' ? 'Oficina' : 'Casa'}</p>
                    ${datos.infoAdicional ? `<p class="text-sm text-gray-500 mt-1">Referencia: ${datos.infoAdicional}</p>` : ''}
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                    <p class="text-sm text-yellow-800"><i class="fas fa-info-circle mr-2"></i><strong>Pago contra entrega</strong> - Pagarás en efectivo al recibir el pedido.</p>
                </div>
                
                <div class="flex gap-3">
                    <button onclick="cerrarModalConfirmacionPrevia()" class="flex-1 border border-gray-300 rounded-full py-2">Cancelar</button>
                    <button onclick="confirmarPedidoFinal('${JSON.stringify(datos).replace(/"/g, '&quot;')}')" class="flex-1 btn-primary py-2 rounded-full">Confirmar pedido</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmHTML);
}

window.cerrarModalConfirmacionPrevia = function() {
    const modal = document.getElementById('modalConfirmacionPrevia');
    if (modal) modal.remove();
};

window.confirmarPedidoFinal = function(datosStr) {
    const datos = JSON.parse(datosStr);
    cerrarModalConfirmacionPrevia();
    guardarDatosEnvio(datos);
    
    // ✅ PRIMERO: Marcar el descuento (antes de limpiar el carrito)
    const user = getCurrentUser();
    const carritoItems = getCart();
    const itemsNormales = carritoItems.filter(item => !item.esParteDePack && !item.esPack);
    const hayProductosIndividuales = itemsNormales.length > 0;
    
    console.log('🔍 carritoItems (antes de limpiar):', carritoItems);
    console.log('🔍 itemsNormales:', itemsNormales);
    console.log('🔍 hayProductosIndividuales:', hayProductosIndividuales);
    
    if (!usedCoupon && user && user.email && hayProductosIndividuales) {
        console.log('✅ Guardando descuento para:', user.email);
        localStorage.setItem(`luma_descuento_usado_${user.email}`, 'true');
        usedCoupon = true;
        localStorage.setItem('lumaCouponUsed', 'true');
    }
    
    // Enviar correo de confirmación para contraentrega
    (async () => {
        try {
            const carritoActual = getCart();
            const itemsVisibles = carritoActual.filter(item => !item.esParteDePack);
            
            const subtotal = itemsVisibles.reduce((s, i) => s + (i.precio * i.cantidad), 0);
            let descuento = 0;
            const userEmail = getCurrentUser();
            
            const hayProductosIndividuales2 = itemsVisibles.some(item => !item.esPack);
            let descuentoYaUsado = false;
            if (userEmail && userEmail.email) {
                descuentoYaUsado = localStorage.getItem(`luma_descuento_usado_${userEmail.email}`) === 'true';
            }
            
            if (cuponAplicado && cuponInfo && !cuponInfo.usado) {
                descuento = subtotal * (cuponInfo.valor / 100);
            } else if (userEmail && hayProductosIndividuales2 && !descuentoYaUsado && !usedCoupon) {
                descuento = subtotal * 0.3;
            }
            
            const envio = subtotal >= 99990 ? 0 : 17500;
            const total = subtotal - descuento + envio;
            
            const productosCorreo = itemsVisibles.map(item => ({
                nombre: item.nombre,
                talla: item.talla || 'Única',
                cantidad: item.cantidad,
                precio: item.precio
            }));
            
            const datosCorreo = {
                nombre: datos.nombre,
                email: userEmail?.email || datos.email || 'cliente@email.com',
                numeroPedido: 'LUMA-' + Date.now(),
                total: total,
                metodoPago: 'contraentrega',
                direccion: datos.direccion,
                ciudad: datos.ciudad,
                productos: productosCorreo
            };
            
            await enviarCorreoConfirmacion(datosCorreo);
            console.log('✅ Correo contraentrega enviado a:', datosCorreo.email);
        } catch (errorCorreo) {
            console.error('❌ Error al enviar correo contraentrega:', errorCorreo);
        }
    })();
    
    // ✅ LUEGO: Finalizar compra (esto limpia el carrito)
    window.finalizarCompraConDatosEnvio(datos);
    cerrarModalEnvio();
    
    // Recargar la página para actualizar el estado
    setTimeout(() => {
        window.location.reload();
    }, 10000);
};





// ==================== GOOGLE MAPS ====================

let mapa;
let marcador;
let geocoder;

function iniciarMapa() {
    const apiKey = 'AIzaSyCMABXlpkaFtFGyb95AKQGqmBMQQQnXNps';
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

window.initMap = function() {
    const ubicacionPredeterminada = { lat: 4.7110, lng: -74.0721 };
    mapa = new google.maps.Map(document.getElementById('mapa'), {
        zoom: 12,
        center: ubicacionPredeterminada
    });
    geocoder = new google.maps.Geocoder();
    
    marcador = new google.maps.Marker({
        position: ubicacionPredeterminada,
        map: mapa,
        draggable: true
    });
    
    marcador.addListener('dragend', () => {
        const pos = marcador.getPosition();
        geocoder.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results[0]) {
                document.getElementById('envioDireccion').value = results[0].formatted_address;
            }
        });
    });
};

function buscarDireccion() {
    const direccion = document.getElementById('envioDireccion').value;
    if (!direccion || !geocoder) {
        mostrarMensaje('Escribe una dirección primero', 'warning');
        return;
    }
    
    geocoder.geocode({ address: direccion }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            mapa.setCenter(location);
            marcador.setPosition(location);
            mapa.setZoom(15);
            document.getElementById('envioDireccion').value = results[0].formatted_address;
        } else {
            mostrarMensaje('No se encontró la dirección: ' + status, 'error');
        }
    });
}

function buscarDireccionCompleta(direccionCompleta) {
    if (!geocoder) return;
    
    geocoder.geocode({ address: direccionCompleta }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            mapa.setCenter(location);
            marcador.setPosition(location);
            mapa.setZoom(15);
        }
    });
}

document.getElementById('btnBuscarMapa')?.addEventListener('click', () => {
    const mapaContainer = document.getElementById('mapaContainer');
    if (mapaContainer.classList.contains('hidden')) {
        mapaContainer.classList.remove('hidden');
        if (!window.google) {
            iniciarMapa();
        } else {
            buscarDireccion();
        }
    } else {
        buscarDireccion();
    }
});

// ==================== ACTUALIZAR MAPA AL ESCRIBIR ====================

const inputDireccion = document.getElementById('envioDireccion');
const inputCiudad = document.getElementById('envioCiudad');

function actualizarMapaPorDireccion() {
    const direccion = inputDireccion?.value || '';
    const ciudad = inputCiudad?.value || '';
    const direccionCompleta = ciudad ? `${direccion}, ${ciudad}` : direccion;
    
    if (window.google && geocoder && direccionCompleta && direccionCompleta.length > 5) {
        buscarDireccionCompleta(direccionCompleta);
    }
}

if (inputDireccion) {
    inputDireccion.addEventListener('change', actualizarMapaPorDireccion);
    inputDireccion.addEventListener('blur', actualizarMapaPorDireccion);
}
if (inputCiudad) {
    inputCiudad.addEventListener('change', actualizarMapaPorDireccion);
    inputCiudad.addEventListener('blur', actualizarMapaPorDireccion);
}

// ==================== FORMULARIO DE ENVÍO ====================

document.getElementById('formEnvio')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErroresCampos();
    
    const nombre = document.getElementById('envioNombre').value.trim();
    const apellido = document.getElementById('envioApellido').value.trim();
    const cedula = document.getElementById('envioCedula').value.trim();
    const telefono = document.getElementById('envioTelefono').value.trim();
    const ciudad = document.getElementById('envioCiudad').value.trim();
    const direccion = document.getElementById('envioDireccion').value.trim();
    const tipoVivienda = document.getElementById('envioTipoVivienda').value;
    const infoAdicional = document.getElementById('envioInfoAdicional').value.trim();
    
    let tieneError = false;
    
    if (!nombre) { mostrarErrorCampo('envioNombre', 'El nombre es obligatorio'); tieneError = true; }
    if (!apellido) { mostrarErrorCampo('envioApellido', 'El apellido es obligatorio'); tieneError = true; }
    if (!cedula) { mostrarErrorCampo('envioCedula', 'La cédula es obligatoria'); tieneError = true; }
    else if (!/^\d+$/.test(cedula)) { mostrarErrorCampo('envioCedula', 'La cédula debe contener solo números'); tieneError = true; }
    if (!telefono) { mostrarErrorCampo('envioTelefono', 'El teléfono es obligatorio'); tieneError = true; }
    else if (!/^\d+$/.test(telefono)) { mostrarErrorCampo('envioTelefono', 'El teléfono debe contener solo números'); tieneError = true; }
    if (!ciudad) { mostrarErrorCampo('envioCiudad', 'La ciudad es obligatoria'); tieneError = true; }
    if (!direccion) { mostrarErrorCampo('envioDireccion', 'La dirección es obligatoria'); tieneError = true; }
    
    if (tieneError) {
        mostrarMensaje('⚠️ Por favor completa todos los campos obligatorios', 'warning');
        return;
    }
    
    const datos = { nombre, apellido, cedula, telefono, ciudad, direccion, tipoVivienda, infoAdicional };
    mostrarConfirmacionAntesDeFinalizar(datos);
});

// ==================== CHECKOUT (CORREGIDO) ====================

const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
        const pagoContraentrega = document.getElementById('pagoContraentrega');
        const carritoActual = getCart();
    
        if (pagoContraentrega && pagoContraentrega.checked) {
            // Contraentrega - NO usar ePayco
            if (carritoActual.length === 0) {
                mostrarMensaje('🛒 Tu carrito está vacío', 'warning');
                return;
            }
            abrirModalEnvio();  // ← Esto debe ejecutarse, NO procesarPagoConEpayco
        } else {
            // ePayco - pago en línea
            if (carritoActual.length === 0) {
                mostrarMensaje('🛒 Tu carrito está vacío', 'warning');
                return;
            }
            procesarPagoConEpayco(carritoActual, usedCoupon);
        }
    };
}

// ==================== CUPÓN ====================

const aplicarCuponBtn = document.getElementById('aplicarCuponCarrito');
if (aplicarCuponBtn) {
    aplicarCuponBtn.addEventListener('click', () => {
        const codigo = document.getElementById('codigoCuponCarrito').value;
        const mensajeDiv = document.getElementById('cuponMensajeCarrito');
        
        if (!codigo) {
            mensajeDiv.innerHTML = '<span class="text-red-500">Ingresa un código</span>';
            mensajeDiv.classList.remove('hidden');
            return;
        }
        
        import('./cart.js').then(module => {
            const resultado = module.aplicarCupon(codigo);
            mensajeDiv.innerHTML = `<span class="${resultado.success ? 'text-green-600' : 'text-red-500'}">${resultado.message}</span>`;
            mensajeDiv.classList.remove('hidden');
            
            if (resultado.success) {
                document.getElementById('codigoCuponCarrito').value = '';
                setTimeout(() => mensajeDiv.classList.add('hidden'), 3000);
            }
        });
    });
}

function solicitarCambio(numeroPedido) {
    const mensaje = `Hola LUMA, quiero solicitar un cambio para el pedido ${numeroPedido}. Por favor, indíquenme los pasos a seguir.`;
    const url = `https://wa.me/573233877904?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

window.solicitarCambio = solicitarCambio;

// ==================== INICIALIZACIÓN ====================

window.addToCart = addToCart;
window.updateCartUI = updateCartUI;
window.abrirModalEnvio = abrirModalEnvio;
window.cerrarModalEnvio = cerrarModalEnvio;

// Event listener para el botón confirmar del pack mejorado
const confirmarPackBtn = document.getElementById('confirmarPackBtn');
if (confirmarPackBtn) {
    const newBtn = confirmarPackBtn.cloneNode(true);
    confirmarPackBtn.parentNode.replaceChild(newBtn, confirmarPackBtn);
    newBtn.addEventListener('click', () => {
        if (packProductosTemp.length !== packCantidadActual) {
            mostrarMensaje(`Selecciona ${packCantidadActual} productos para completar el pack`, 'warning');
            return;
        }
        
        const packData = {
            cantidad: packCantidadActual,
            imagenPack: packCantidadActual === 3 ? 'URL_IMAGEN_PACK_3' : 'URL_IMAGEN_PACK_4',
            productosSeleccionados: packProductosTemp.map(p => ({
                id: p.id,
                nombre: p.referencia,
                colorNombre: p.color,
                talla: p.talla,
                precio: p.PRECIO,
                imagen: p.IMAGEN,
                color: p.color.toLowerCase()
            }))
        };

        addPackToCart(packData);
        cerrarPackModal();
        mostrarMensaje(`🎉 Pack ${packCantidadActual} bodys agregado al carrito`, 'success');
    });
}

async function iniciarLUMA() {
    console.log("🔄 Iniciando LUMA...");
    
    // Esperar a que los productos se carguen desde Firestore
    await actualizarProductos();
    
    const user = getCurrentUser();
    const userNameSpan = document.getElementById('userName');
    if (user && userNameSpan) userNameSpan.innerText = user.name.split(' ')[0];
    else if (userNameSpan) userNameSpan.innerText = 'Invitado';
    
    // Una vez cargados los productos, renderizar todo
    renderProductosDestacados();
    renderFilters();
    renderProducts();
    updateCartUI();
    cargarReferenciasPack();
    
    if (!getCurrentUser() && typeof showRegisterModal === 'function') {
        setTimeout(() => showRegisterModal(), 800);
    }
}

// ==================== MENÚ MÓVIL ====================

const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

function cerrarMenuMobile() {
    if (mobileMenu) {
        mobileMenu.classList.add('hidden');
    }
}

window.cerrarMenuMobile = cerrarMenuMobile;

if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('hidden');
    });
    
    document.addEventListener('click', function(event) {
        if (!mobileMenu.classList.contains('hidden')) {
            if (!menuBtn.contains(event.target) && !mobileMenu.contains(event.target)) {
                cerrarMenuMobile();
            }
        }
    });
    
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (!mobileMenu.classList.contains('hidden')) {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                cerrarMenuMobile();
            }, 100);
        }
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            cerrarMenuMobile();
        }
    });
}

// ==================== CARRUSEL PARA PRODUCTOS DESTACADOS ====================

let carruselIndex = 0;
let carruselSlidesPorVista = 2;

function inicializarCarrusel() {
    const track = document.getElementById('productosDestacados');
    if (!track) {
        console.log("❌ track no encontrado");
        return;
    }
    
    const slides = document.querySelectorAll('.carrusel-slide');
    if (slides.length === 0) {
        console.log("❌ No hay slides para el carrusel");
        return;
    }
    
    console.log(`🔄 Inicializando carrusel con ${slides.length} slides`);
    
    // Actualizar carruselItems con los slides actuales
    const carruselItems = Array.from(slides);
    
    function actualizarCarrusel() {
        if (window.innerWidth >= 768) {
            track.style.transform = 'translateX(0)';
            return;
        }
        
        const slideWidth = slides[0].offsetWidth;
        const desplazamiento = carruselIndex * slideWidth;
        track.style.transform = `translateX(-${desplazamiento}px)`;
    }
    
    const prevBtn = document.getElementById('carruselPrev');
    const nextBtn = document.getElementById('carruselNext');
    
    if (prevBtn) {
        // Remover event listeners anteriores para evitar duplicados
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        newPrevBtn.onclick = () => {
            if (carruselIndex > 0) {
                carruselIndex--;
                actualizarCarrusel();
                console.log("⬅️ Anterior, índice:", carruselIndex);
            }
        };
    }
    
    if (nextBtn) {
        // Remover event listeners anteriores
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.onclick = () => {
            const maxIndex = carruselItems.length - 2;
            if (carruselIndex < maxIndex) {
                carruselIndex++;
                actualizarCarrusel();
                console.log("➡️ Siguiente, índice:", carruselIndex);
            }
        };
    }
    
    window.addEventListener('resize', () => {
        carruselIndex = 0;
        actualizarCarrusel();
    });
    
    actualizarCarrusel();
}

function verImagenPack(urlImagen) {
    if (typeof abrirLightbox === 'function') {
        abrirLightbox([urlImagen], 0);
    } else {
        window.open(urlImagen, '_blank');
    }
}

window.verImagenPack = verImagenPack;

// ==================== FORMULARIO DE CONTACTO ====================

function mostrarFormularioContacto(tipo) {
    const modal = document.getElementById('modalContacto');
    const titulo = document.getElementById('modalContactoTitulo');
    const tipoInput = document.getElementById('tipoInteres');
    
    if (tipo === 'distribuidor') {
        titulo.innerText = 'Ser distribuidor';
        tipoInput.value = 'distribuidor';
    } else {
        titulo.innerText = 'Ser afiliado';
        tipoInput.value = 'afiliado';
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function cerrarModalContacto() {
    const modal = document.getElementById('modalContacto');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('formContacto').reset();
}

async function enviarFormularioContacto(event) {
    event.preventDefault();
    
    const tipo = document.getElementById('tipoInteres').value;
    const nombre = document.getElementById('contactoNombre').value;
    const email = document.getElementById('contactoEmail').value;
    const telefono = document.getElementById('contactoTelefono').value;
    const mensaje = document.getElementById('contactoMensaje').value;
    
    const templateParams = {
        email_cliente: 'info@lumacolombia.com',
        tipo: tipo,
        nombre: nombre,
        email: email,
        telefono: telefono,
        mensaje: mensaje || 'Sin mensaje adicional',
        fecha: new Date().toLocaleString()
    };
    
    try {
        await emailjs.send('service_nfns0rk', 'template_contacto', templateParams);
        alert('✅ Solicitud enviada. Te contactaremos pronto.');
        cerrarModalContacto();
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al enviar. Intenta de nuevo o escríbenos a info@lumacolombia.com');
    }
}

window.mostrarFormularioContacto = mostrarFormularioContacto;
window.cerrarModalContacto = cerrarModalContacto;
window.enviarFormularioContacto = enviarFormularioContacto;

function cargarReferenciasPack() {
    const selectRef = document.getElementById('selectReferencia');
    if (!selectRef) return;
    
    const referenciasUnicas = {};
    productos.forEach(p => {
        const categoria = p.CATEGORIA || p.categoria || 'BODY';
        const nombre = p.NOMBRE || p.nombre;
        const key = `${categoria}-${nombre}`;
        if (!referenciasUnicas[key]) {
            referenciasUnicas[key] = { categoria, nombre };
        }
    });
    
    while (selectRef.options.length > 1) {
        selectRef.remove(1);
    }
    
    Object.values(referenciasUnicas).forEach(ref => {
        const option = document.createElement('option');
        option.value = ref.nombre;
        option.textContent = `${ref.categoria} - ${ref.nombre}`;
        selectRef.appendChild(option);
    });
}

// ==================== FUNCIONES DEL MODAL DE PRODUCTO ====================

window.seleccionarTallaModal = function(talla) {
    if (window.modalState && window.modalState.seleccionarTalla) {
        window.modalState.seleccionarTalla(talla);
        window.modalState.talla = talla;
    }
};

window.cambiarCantidadModal = function(delta) {
    if (window.modalState) {
        const nuevaCantidad = window.modalState.cantidad + delta;
        if (nuevaCantidad >= 1 && nuevaCantidad <= 10) {
            window.modalState.cantidad = nuevaCantidad;
            const modalCantidad = document.getElementById('modalCantidad');
            if (modalCantidad) modalCantidad.innerText = nuevaCantidad;
        }
    }
};

window.cambiarImagenModal = function(direccion) {
    if (window.modalState) {
        let nuevaImagen = window.modalState.imagenActual + direccion;
        if (nuevaImagen >= 0 && nuevaImagen < window.modalState.imagenes.length) {
            window.modalState.imagenActual = nuevaImagen;
            const imgPrincipal = document.getElementById('modalImagenPrincipal');
            if (imgPrincipal) imgPrincipal.src = window.modalState.imagenes[nuevaImagen];
            const miniaturas = document.querySelectorAll('#productModalContent .flex.gap-2 img');
            miniaturas.forEach((img, idx) => {
                if (idx === nuevaImagen) {
                    img.classList.add('border-[#4d4845]', 'border-2');
                    img.classList.remove('border-transparent');
                } else {
                    img.classList.remove('border-[#4d4845]', 'border-2');
                    img.classList.add('border-transparent');
                }
            });
        }
    }
};

window.cambiarImagenModalA = function(idx) {
    if (window.modalState && idx < window.modalState.imagenes.length) {
        window.modalState.imagenActual = idx;
        const imgPrincipal = document.getElementById('modalImagenPrincipal');
        if (imgPrincipal) imgPrincipal.src = window.modalState.imagenes[idx];
        const miniaturas = document.querySelectorAll('#productModalContent .flex.gap-2 img');
        miniaturas.forEach((img, i) => {
            if (i === idx) {
                img.classList.add('border-[#4d4845]', 'border-2');
                img.classList.remove('border-transparent');
            } else {
                img.classList.remove('border-[#4d4845]', 'border-2');
                img.classList.add('border-transparent');
            }
        });
    }
};

// ==================== FIN ====================

iniciarLUMA();
