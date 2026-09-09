document.addEventListener('DOMContentLoaded', initProduccion);

let participants = [];
let totalCamisetas = 0;
let totalShorts = 0;
let totalArqueros = 0;
let sizeCounts = {};

const proveedores = {
    'A': { nombre: 'Don Pepe', costoCamiseta: 4.00, costoShort: 3.00 },
    'B': { nombre: 'Premium', costoCamiseta: 5.50, costoShort: 4.00 }
};

const ID_PEDIDO = 'SUB-00842';

async function initProduccion() {
    // 1. Cargar datos de la única fuente de verdad (API Backend)
    try {
        const res = await fetch(`/api/pedidos/${ID_PEDIDO}/participantes`);
        if (res.ok) {
            const data = await res.json();
            participants = data.map(p => ({
                id: p.id,
                playerName: p.nombre_jugador,
                shirtName: p.nombre_camiseta,
                shirtNumber: p.numero_camiseta,
                size: p.talla_camiseta,
                genderCut: p.genero_corte,
                shortSize: p.talla_short,
                isGoalkeeper: p.es_arquero,
                productType: p.tipo_producto,
                paymentStatus: p.estado_pago || 'Pendiente'
            }));
        }
    } catch (e) {
        console.error("Error al cargar participantes desde API", e);
    }

    // 2. Procesar datos para Producción
    procesarDatos();

    // 3. Renderizar vista de operarios
    renderizarOperativa();

    // 4. Configurar listeners de finanzas
    setupFinanceListeners();

    // 5. Calcular finanzas por primera vez
    calcularRentabilidad();
}

function procesarDatos() {
    participants.forEach(p => {
        // Camisetas
        totalCamisetas++;

        // Arqueros
        if (p.isGoalkeeper) totalArqueros++;

        // Shorts
        if (p.productType === 'conjunto') totalShorts++;

        // Curva de tallas Camiseta
        let cut = p.genderCut || 'Hombre';
        if (p.isGoalkeeper) cut = 'ARQUERO';
        const sizeKey = `Camiseta ${p.size} (${cut.charAt(0)})`;
        sizeCounts[sizeKey] = (sizeCounts[sizeKey] || 0) + 1;

        // Curva de tallas Short
        if (p.productType === 'conjunto') {
            const sSize = p.shortSize || p.size;
            const shortKey = `Short ${sSize}`;
            sizeCounts[shortKey] = (sizeCounts[shortKey] || 0) + 1;
        }
    });
}

function renderizarOperativa() {
    document.getElementById('totCamisetas').textContent = totalCamisetas;
    document.getElementById('totShorts').textContent = totalShorts;
    document.getElementById('totArqueros').textContent = totalArqueros;

    const sizesGridEl = document.getElementById('prodSizesGrid');
    sizesGridEl.innerHTML = Object.keys(sizeCounts).sort().map(sizeKey => {
        const count = sizeCounts[sizeKey];
        return `
            <div class="size-box">
                <span class="sz">${sizeKey}</span>
                <span class="ct">${count} und</span>
            </div>
        `;
    }).join('');
}

function setupFinanceListeners() {
    const inputs = ['metrosTela', 'costoMetro', 'tallerSelect', 'costoFijo', 'precioVenta'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calcularRentabilidad);
    });
    document.getElementById('tallerSelect').addEventListener('change', calcularRentabilidad);
}

function calcularRentabilidad() {
    // Capturar inputs
    const metros = parseFloat(document.getElementById('metrosTela').value) || 0;
    const costoMetro = parseFloat(document.getElementById('costoMetro').value) || 0;
    const tallerKey = document.getElementById('tallerSelect').value;
    const costoFijo = parseFloat(document.getElementById('costoFijo').value) || 0;
    const precioVenta = parseFloat(document.getElementById('precioVenta').value) || 0;

    const taller = proveedores[tallerKey];

    // Cálculos
    const costoTela = metros * costoMetro;
    const costoConfeccion = (totalCamisetas * taller.costoCamiseta) + (totalShorts * taller.costoShort);
    const costoTotal = costoTela + costoConfeccion + costoFijo;
    const utilidad = precioVenta - costoTotal;
    const margenPct = precioVenta > 0 ? (utilidad / precioVenta) * 100 : 0;

    // Actualizar UI - Labels
    document.getElementById('lblMetros').textContent = metros;
    document.getElementById('lblPrendas').textContent = totalCamisetas + totalShorts;

    // Actualizar UI - Dinero
    document.getElementById('outCostoTela').textContent = costoTela.toFixed(2);
    document.getElementById('outCostoConfeccion').textContent = costoConfeccion.toFixed(2);
    document.getElementById('outCostoFijo').textContent = costoFijo.toFixed(2);
    document.getElementById('outUtilidad').textContent = utilidad.toFixed(2);

    // Margen
    document.getElementById('outMargenPct').textContent = margenPct.toFixed(1);
    const bar = document.getElementById('margenBar');
    if (margenPct < 0) {
        bar.style.width = '100%';
        bar.style.background = '#ef4444'; // Rojo si pierde dinero
    } else {
        bar.style.width = Math.min(margenPct, 100) + '%';
        bar.style.background = margenPct > 30 ? '#10b981' : '#f59e0b'; // Verde si es >30%, naranja si es menos
    }
}
