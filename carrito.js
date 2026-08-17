// Cargar el carrito guardado o iniciar uno vacío
let carrito = JSON.parse(localStorage.getItem('carrito_repuestos')) || [];

// 1. Guardar en localStorage y actualizar la vista
function guardarCarrito() {
    localStorage.setItem('carrito_repuestos', JSON.stringify(carrito));
    actualizarVistaCarrito();
}

// 2. Agregar un repuesto al carrito
function agregarAlCarrito(id, nombre, precio, imagenUrl) {
    const item = carrito.find(p => p.id === id);
    if (item) {
        item.cantidad += 1;
    } else {
        carrito.push({
            id: id,
            nombre: nombre,
            precio: parseFloat(precio),
            imagenUrl: imagenUrl,
            cantidad: 1
        });
    }
    guardarCarrito();
}

// 3. Cambiar cantidad (+1 o -1)
function cambiarCantidad(id, cambio) {
    const item = carrito.find(p => p.id === id);
    if (!item) return;

    item.cantidad += cambio;
    if (item.cantidad <= 0) {
        carrito = carrito.filter(p => p.id !== id);
    }
    guardarCarrito();
}

// 4. Actualizar el contador y el contenido del modal
function actualizarVistaCarrito() {
    const contador = document.getElementById('cant-carrito');
    const contenedor = document.getElementById('items-carrito');
    const totalElem = document.getElementById('total-carrito');

    const totalProductos = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    if (contador) contador.textContent = totalProductos;

    if (contenedor) {
        if (carrito.length === 0) {
            contenedor.innerHTML = `<p style="text-align:center; padding:10px; color:#666;">El carrito está vacío</p>`;
        } else {
            let html = '';
            carrito.forEach(p => {
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <div>
                            <strong style="font-size:13px; display:block;">${p.nombre}</strong>
                            <small>Q${p.precio} c/u</small>
                        </div>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <button onclick="cambiarCantidad(${p.id}, -1)">-</button>
                            <span>${p.cantidad}</span>
                            <button onclick="cambiarCantidad(${p.id}, 1)">+</button>
                        </div>
                    </div>
                `;
            });
            contenedor.innerHTML = html;
        }
    }

    const totalPagar = carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    if (totalElem) totalElem.textContent = `Q${totalPagar.toFixed(2)}`;
}

// 5. Generar link y mandar a WhatsApp
function enviarPedidoWhatsApp(numeroTel) {
    if (carrito.length === 0) return alert("Agregá productos primero.");

    let texto = "*¡Hola! Me interesa pedir estos repuestos:*\n\n";
    let total = 0;

    carrito.forEach(p => {
        const sub = p.precio * p.cantidad;
        total += sub;
        texto += `• ${p.cantidad}x ${p.nombre} - Q${sub.toFixed(2)}\n`;
    });

    texto += `\n*Total: Q${total.toFixed(2)}*`;
    
    const url = `https://api.whatsapp.com/send?phone=${numeroTel}&text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', actualizarVistaCarrito);