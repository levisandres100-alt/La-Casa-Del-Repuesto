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

// ==========================================
// BUSCADOR GLOBAL "TODO TERRENO" (A prueba de fallos)
// ==========================================

let cacheProductos = []; 

// Función para quitar tildes y dejar todo en minúsculas
function normalizar(texto) {
  if (!texto) return "";
  return texto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Cargar productos con re-intento si Supabase tarda
async function cargarCacheProductos() {
  if (typeof db !== 'undefined') {
    try {
      const { data, error } = await db.from('productos').select('*');
      if (data && !error) cacheProductos = data;
    } catch (e) {
      console.log("Error cargando caché:", e);
    }
  }
}
cargarCacheProductos();

document.addEventListener('DOMContentLoaded', () => {
  // 1. CREAR EL BOTÓN (LUPA)
  const btnBuscador = document.createElement('div');
  btnBuscador.id = 'btn-buscador-flotante';
  btnBuscador.innerHTML = '🔍';
  btnBuscador.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; background: #333; color: #fff;
    width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 22px; cursor: pointer; z-index: 1000;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  `;

  // 2. CREAR LA CAJA DE RESULTADOS
  const cajaBuscador = document.createElement('div');
  cajaBuscador.id = 'caja-buscador-flotante';
  cajaBuscador.style.cssText = `
    display: none; position: fixed; bottom: 80px; left: 20px; background: white;
    padding: 12px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.25);
    z-index: 1001; border: 2px solid #e63946; width: 280px; max-height: 350px; overflow-y: auto;
  `;

  cajaBuscador.innerHTML = `
    <input type="text" id="input-buscador-flotante" placeholder="🔍 Buscar repuesto..." style="width:100%; border:1px solid #ccc; outline:none; padding:8px 12px; font-size:14px; border-radius:20px; box-sizing:border-box;">
    <div id="resultados-busqueda" style="margin-top:10px;"></div>
  `;

  document.body.appendChild(btnBuscador);
  document.body.appendChild(cajaBuscador);

  const input = document.getElementById('input-buscador-flotante');
  const resultadosDiv = document.getElementById('resultados-busqueda');

  // Abrir / Cerrar al clic
  btnBuscador.addEventListener('click', async () => {
    const visible = cajaBuscador.style.display === 'block';
    cajaBuscador.style.display = visible ? 'none' : 'block';
    if (!visible) {
      input.focus();
      // Si por alguna razón el caché estaba vacío, vuelve a intentar cargarlo al abrir
      if (cacheProductos.length === 0) await cargarCacheProductos();
    }
  });

  // Filtrado en tiempo real
  input.addEventListener('input', () => {
    const termino = normalizar(input.value.trim());

    if (termino.length < 2) {
      resultadosDiv.innerHTML = '';
      return;
    }

    const filtrados = cacheProductos.filter(p => 
      normalizar(p.nombre).includes(termino)
    ).slice(0, 5);

    if (filtrados.length === 0) {
      resultadosDiv.innerHTML = '<p style="font-size:12px; color:#888; text-align:center;">No encontramos repuestos.</p>';
      return;
    }

    resultadosDiv.innerHTML = '';
    filtrados.forEach(prod => {
      // Manejo flexible por si la propiedad de la imagen se llama imagenUrl o imagen_url
      const img = prod.imagenUrl || prod.imagen_url || 'https://via.placeholder.com/40';
      const precioNum = parseFloat(prod.precio) || 0;

      const item = document.createElement('div');
      item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee; cursor:pointer;';
      item.innerHTML = `
        <img src="${img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
        <div style="flex:1;">
          <strong style="font-size:12px; display:block; color:#333;">${prod.nombre}</strong>
          <small style="color:#e63946; font-weight:bold;">Q${precioNum.toFixed(2)}</small>
        </div>
      `;
      
      item.onclick = () => {
        agregarAlCarrito(prod.id, prod.nombre, prod.precio, img);
        alert(`¡${prod.nombre} agregado!`);
      };
      resultadosDiv.appendChild(item);
    });
  });
});
