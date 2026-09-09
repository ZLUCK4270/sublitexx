// app.js - Lógica interactiva para el MVP del SIPES

// Estado de la aplicación
let participants = [];
let editingId = null;
let expectedPlayers = 25;
let unitPriceConjunto = 50.00;
let unitPriceCamiseta = 35.00;
let deliveryDate = '2026-10-15';

// --- Order Configuration (from diseno.html) ---
let orderConfig = {
    producto: 'conjunto',
    tela: 'winfresh',
    corte: 'estandar_varon',
    cuello: 'redondo',
    manga: 'corta',
    colorPrincipal: '#1E3A8A',
    colorSecundario: '#FBBF24',
    confArquero: '',
    notasTecnicas: '',
    opciones: {
        banderola: false,
        bandaCapitan: false,
        escudo: false,
        medias: false,
        personalizacionEspecial: ''
    },
    mockups: {
        principal: {
            delantera: null,
            espalda: null
        },
        arquero: {
            delantera: null,
            espalda: null
        }
    }
};

// Sincronización con la API Backend
const ID_PEDIDO = 'SUB-00842';

async function loadParticipants() {
    try {
        const res = await fetch(`/api/pedidos/${ID_PEDIDO}/participantes`);
        if (res.ok) {
            const data = await res.json();
            // Adaptar estructura de BD al frontend
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
    } catch(e) {
        console.error("Error al cargar participantes", e);
    }
    
    const expData = localStorage.getItem('sipes_expected');
    if (expData) {
        expectedPlayers = parseInt(expData);
    }

    const priceConjuntoData = localStorage.getItem('sipes_unit_price_conjunto') || localStorage.getItem('sipes_unit_price');
    if (priceConjuntoData) {
        unitPriceConjunto = parseFloat(priceConjuntoData);
    }

    const priceCamisetaData = localStorage.getItem('sipes_unit_price_camiseta');
    if (priceCamisetaData) {
        unitPriceCamiseta = parseFloat(priceCamisetaData);
    }

    const dateData = localStorage.getItem('sipes_delivery_date');
    if (dateData) {
        deliveryDate = dateData;
    }
}

function saveParticipantsToStore() {
    // Los participantes individuales ya no se guardan aquí, se hace vía API POST/PUT.
    // Solo guardamos configuración local.
    localStorage.setItem('sipes_expected', expectedPlayers.toString());
    localStorage.setItem('sipes_unit_price_conjunto', unitPriceConjunto.toString());
    localStorage.setItem('sipes_unit_price_camiseta', unitPriceCamiseta.toString());
    localStorage.setItem('sipes_delivery_date', deliveryDate);
}

function formatDateDisplay(isoDate) {
    if (!isoDate) return '-';
    try {
        const parts = isoDate.split('-');
        if (parts.length === 3) {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
            const day = parseInt(parts[2], 10);
            const monthIdx = parseInt(parts[1], 10) - 1;
            const year = parts[0];
            return `${day} ${months[monthIdx] || ''} ${year}`;
        }
    } catch(e) {}
    return isoDate;
}

// --- Order Config Functions ---
function loadOrderConfig() {
    const saved = localStorage.getItem('sipes_order_config');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            orderConfig = Object.assign(orderConfig, parsed);
            if (parsed.producto) orderConfig.producto = parsed.producto;
            if (parsed.opciones) orderConfig.opciones = Object.assign(orderConfig.opciones, parsed.opciones);
            if (parsed.mockups) {
                const mockups = parsed.mockups;
                if (mockups.principal) orderConfig.mockups.principal = Object.assign({ delantera: null, espalda: null }, mockups.principal);
                if (mockups.arquero) orderConfig.mockups.arquero = Object.assign({ delantera: null, espalda: null }, mockups.arquero);
            }
        } catch(e) { /* ignore corrupted data */ }
    }
    renderOrderSummary();
    updateProductViewVisibility();
}

function updateProductViewVisibility() {
    const prod = orderConfig.producto || 'conjunto';

    // 1. Receptionist Price Inputs (index.html)
    const priceConjuntoWrapper = document.getElementById('priceConjuntoWrapper');
    const priceCamisetaWrapper = document.getElementById('priceCamisetaWrapper');
    const unitPriceConjuntoInput = document.getElementById('unitPriceConjuntoInput');
    const unitPriceCamisetaInput = document.getElementById('unitPriceCamisetaInput');

    if (unitPriceConjuntoInput) unitPriceConjuntoInput.value = unitPriceConjunto.toFixed(2);
    if (unitPriceCamisetaInput) unitPriceCamisetaInput.value = unitPriceCamiseta.toFixed(2);

    if (priceConjuntoWrapper) {
        priceConjuntoWrapper.style.display = (prod === 'conjunto' || prod === 'mixto') ? 'block' : 'none';
    }
    if (priceCamisetaWrapper) {
        priceCamisetaWrapper.style.display = (prod === 'camiseta' || prod === 'mixto') ? 'block' : 'none';
    }

    // 2. Coordinator Price Displays (vista_coordinador.html)
    const coordPriceConjuntoWrapper = document.getElementById('coordPriceConjuntoWrapper');
    const coordPriceCamisetaWrapper = document.getElementById('coordPriceCamisetaWrapper');
    const coordUnitPriceConjuntoText = document.getElementById('coordUnitPriceConjuntoText');
    const coordUnitPriceCamisetaText = document.getElementById('coordUnitPriceCamisetaText');

    if (coordUnitPriceConjuntoText) coordUnitPriceConjuntoText.textContent = `S/ ${unitPriceConjunto.toFixed(2)}`;
    if (coordUnitPriceCamisetaText) coordUnitPriceCamisetaText.textContent = `S/ ${unitPriceCamiseta.toFixed(2)}`;

    if (coordPriceConjuntoWrapper) {
        coordPriceConjuntoWrapper.style.display = (prod === 'conjunto' || prod === 'mixto') ? 'block' : 'none';
    }
    if (coordPriceCamisetaWrapper) {
        coordPriceCamisetaWrapper.style.display = (prod === 'camiseta' || prod === 'mixto') ? 'block' : 'none';
    }

    // 3. Table Column Header "Producto"
    const thProducto = document.getElementById('thProducto');
    if (thProducto) {
        thProducto.style.display = (prod === 'mixto') ? '' : 'none';
    }

    // 4. Right Sidebar Producción Total
    const rsBoxConjuntos = document.getElementById('rsBoxConjuntos');
    const rsBoxCamisetas = document.getElementById('rsBoxCamisetas');
    const rsProdGrid = document.getElementById('rsProdGrid');

    if (rsBoxConjuntos && rsBoxCamisetas && rsProdGrid) {
        if (prod === 'mixto') {
            rsBoxConjuntos.style.display = 'block';
            rsBoxCamisetas.style.display = 'block';
            rsProdGrid.style.gridTemplateColumns = '1fr 1fr';
        } else if (prod === 'conjunto') {
            rsBoxConjuntos.style.display = 'block';
            rsBoxCamisetas.style.display = 'none';
            rsProdGrid.style.gridTemplateColumns = '1fr';
        } else if (prod === 'camiseta') {
            rsBoxConjuntos.style.display = 'none';
            rsBoxCamisetas.style.display = 'block';
            rsProdGrid.style.gridTemplateColumns = '1fr';
        }
    }

    // 5. Modal Product Row & Short Size
    const productTypeRow = document.getElementById('productTypeRow');
    const shortSizeGroup = document.getElementById('shortSizeGroup');
    if (productTypeRow) {
        productTypeRow.style.display = (prod === 'mixto') ? 'flex' : 'none';
    }
    if (shortSizeGroup) {
        if (prod === 'conjunto') shortSizeGroup.style.display = 'block';
        if (prod === 'camiseta') shortSizeGroup.style.display = 'none';
    }
}

function renderOrderSummary() {
    const container = document.getElementById('configSummaryContainer');
    if (!container) return;

    const productoLabels = {
        conjunto: 'Conjunto Completo',
        camiseta: 'Solo Camiseta',
        mixto: 'Mixto (Conjunto y Camiseta)'
    };
    const telaLabels = { winfresh: 'Win Fresh', microfibra: 'Microfibra', algodon: 'Algodón Pima' };
    const corteLabels = { estandar_varon: 'Estándar Varón', estandar_mujer: 'Estándar Mujer', infantil: 'Infantil', unisex: 'Unisex' };
    const mangaLabels = { corta: 'Manga Corta', larga: 'Manga Larga', tres_cuartos: 'Manga 3/4' };
    const cuelloLabels = { v: 'Cuello en V', redondo: 'Cuello Redondo', camisero: 'Cuello Camisero', neru: 'Cuello Neru' };

    const opciones = orderConfig.opciones;
    const activeOpciones = [];
    if (opciones.banderola) activeOpciones.push('Banderola');
    if (opciones.bandaCapitan) activeOpciones.push('Banda de Capitán');
    if (opciones.escudo) activeOpciones.push('Escudo');
    if (opciones.medias) activeOpciones.push('Medias');
    if (opciones.personalizacionEspecial) activeOpciones.push(opciones.personalizacionEspecial);

    let html = '';
    html += '<div class="config-summary-grid">';
    html += '<div class="config-item"><span class="config-label">Producto</span><span class="config-value">' + (productoLabels[orderConfig.producto] || 'Conjunto Completo') + '</span></div>';
    html += '<div class="config-item"><span class="config-label">Tela</span><span class="config-value">' + (telaLabels[orderConfig.tela] || orderConfig.tela) + '</span></div>';
    html += '<div class="config-item"><span class="config-label">Corte</span><span class="config-value">' + (corteLabels[orderConfig.corte] || orderConfig.corte) + '</span></div>';
    html += '<div class="config-item"><span class="config-label">Manga</span><span class="config-value">' + (mangaLabels[orderConfig.manga] || orderConfig.manga) + '</span></div>';
    html += '<div class="config-item"><span class="config-label">Cuello</span><span class="config-value">' + (cuelloLabels[orderConfig.cuello] || orderConfig.cuello) + '</span></div>';
    if (orderConfig.confArquero) {
        html += '<div class="config-item config-item-full"><span class="config-label">Arquero</span><span class="config-value">' + orderConfig.confArquero + '</span></div>';
    }
    html += '</div>';

    if (activeOpciones.length > 0) {
        html += '<div class="config-opciones">';
        html += '<span class="config-label" style="margin-bottom:0.5rem;display:block;">Productos Opcionales</span>';
        html += '<div class="option-chips">';
        activeOpciones.forEach(function(opt) {
            html += '<span class="option-chip">' + opt + '</span>';
        });
        html += '</div></div>';
    }

    container.innerHTML = html;
}

function removeMockup(group, slot) {
    if (orderConfig.mockups && orderConfig.mockups[group]) {
        orderConfig.mockups[group][slot] = null;
        localStorage.setItem('sipes_order_config', JSON.stringify(orderConfig));
        renderOrderSummary();
    }
}

// Referencias DOM
const tbody = document.getElementById('participantsList');
const btnAdd = document.getElementById('btnAddParticipant');
const modalOverlay = document.getElementById('participantModal');
const btnCloseModal = document.getElementById('closeModal');
const btnCancel = document.getElementById('cancelBtn');
const form = document.getElementById('participantForm');
const modalTitle = document.getElementById('modalTitle');

// Referencias DOM para Resumen y Configuración
const totalPrendasEl = document.getElementById('totalPrendas');
const totalConjuntosEl = document.getElementById('totalConjuntos');
const totalCamisetasEl = document.getElementById('totalCamisetas');
const sizesGridEl = document.getElementById('sizesGrid');
const alertsContainerEl = document.getElementById('alertsContainer');
const btnExport = document.getElementById('btnExport');
const btnCloseList = document.getElementById('btnCloseList');
const expectedPlayersInput = document.getElementById('expectedPlayersInput');
const btnSaveExpected = document.getElementById('btnSaveExpected');

// Inicialización
async function init() {
    await loadParticipants();
    loadOrderConfig();
    if(expectedPlayersInput) expectedPlayersInput.value = expectedPlayers;
    const deliveryDateInput = document.getElementById('deliveryDateInput');
    if(deliveryDateInput) deliveryDateInput.value = deliveryDate;
    const coordDeliveryDateText = document.getElementById('coordDeliveryDateText');
    if(coordDeliveryDateText) coordDeliveryDateText.textContent = formatDateDisplay(deliveryDate);
    updateProductViewVisibility();
    renderTable();
    updateSummary();
    setupEventListeners();
}

// Renderizar Tabla
function renderTable() {
    const isMixto = (orderConfig.producto === 'mixto');
    if (participants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isMixto ? 7 : 6}" class="empty-state">No hay participantes registrados. Agrega uno para empezar.</td></tr>`;
        return;
    }

    tbody.innerHTML = participants.map(p => {
        let paymentBadge = '';
        if(p.paymentStatus === 'Pagado') paymentBadge = '<span class="status-badge" style="background:#D1FAE5; color:#065F46;">Pagado</span>';
        else if(p.paymentStatus === 'Abonado') paymentBadge = '<span class="status-badge" style="background:#DBEAFE; color:#1E40AF;">Abonado</span>';
        else paymentBadge = '<span class="status-badge" style="background:#FEE2E2; color:#991B1B;">Pendiente</span>';
        
        const currentPType = p.productType || (orderConfig.producto === 'mixto' ? 'conjunto' : orderConfig.producto) || 'conjunto';

        let tallasText = `<span style="font-weight:700">${p.size || '-'}</span>`;
        if(currentPType === 'conjunto' && p.shortSize && p.shortSize !== 'same' && p.shortSize !== p.size) {
            tallasText = `<div><span style="font-weight:700">${p.size}</span><span style="font-size:0.75rem; color:#6B7280; display:block;">Short: ${p.shortSize}</span></div>`;
        }

        let jugadorText = p.playerName || '-';
        if(p.isGoalkeeper) {
            jugadorText += '<br><span style="color:#DC2626; font-weight:700; font-size:0.68rem; letter-spacing:0.04em;">ARQUERO</span>';
        }

        const prodCol = isMixto
            ? `<td><span class="pill ${currentPType === 'conjunto' ? 'pill-conjunto' : 'pill-camiseta'}">${currentPType === 'conjunto' ? 'Conjunto' : 'Solo Camiseta'}</span></td>`
            : '';

        return `
        <tr>
            <td>${jugadorText}</td>
            <td><strong>${p.shirtName}</strong></td>
            <td>${p.shirtNumber}</td>
            <td>${tallasText}</td>
            ${prodCol}
            <td>${paymentBadge}</td>
            <td class="action-cell">
                <button class="btn btn-edit-ghost" onclick="editParticipant(${p.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger-ghost" onclick="deleteParticipant(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
        `;
    }).join('');
}

// Actualizar Resumen (La "Magia")
function updateSummary() {
    let totalConjuntos = 0;
    let totalCamisetas = 0;
    let totalPaid = 0;
    let totalPending = 0;
    const sizeCounts = {};
    const numbersUsed = {};
    const alerts = [];

    // Calcular totales e identificar problemas
    participants.forEach(p => {
        // Conteo de productos
        if (p.productType === 'conjunto') totalConjuntos++;
        if (p.productType === 'camiseta') totalCamisetas++;
        
        // Pagos
        if (p.paymentStatus === 'Pagado' || p.paymentStatus === 'Abonado') totalPaid++;
        else totalPending++;

        // Conteo de tallas (Camiseta)
        let sizeKey = p.size;
        if (p.isGoalkeeper) sizeKey += ' (Arquero)';
        
        sizeCounts[sizeKey] = (sizeCounts[sizeKey] || 0) + 1;

        // Conteo de tallas de Short
        if (p.productType === 'conjunto') {
            const sSize = p.shortSize || p.size;
            const shortKey = `Short ${sSize}`;
            sizeCounts[shortKey] = (sizeCounts[shortKey] || 0) + 1;
        }

        // Validar unicidad de números
        if (!numbersUsed[p.shirtNumber]) {
            numbersUsed[p.shirtNumber] = [];
        }
        numbersUsed[p.shirtNumber].push(p.shirtName);
    });

    if (totalConjuntosEl) totalConjuntosEl.textContent = totalConjuntos;
    if (totalCamisetasEl) totalCamisetasEl.textContent = totalCamisetas;
    if (totalPrendasEl) totalPrendasEl.textContent = totalConjuntos + totalCamisetas;
    
    const paidEl = document.getElementById('totalPaid');
    const pendingEl = document.getElementById('totalPending');
    if (paidEl) paidEl.textContent = totalPaid;
    if (pendingEl) pendingEl.textContent = totalPending;

    // Renderizar Curva de Tallas (nuevo formato: chips del sidebar derecho)
    sizesGridEl.innerHTML = Object.keys(sizeCounts).sort().map(sizeKey => {
        const count = sizeCounts[sizeKey];
        return `
            <div class="rs-size-chip">
                <div class="size-tag">${sizeKey}</div>
                <div class="size-qty">${count} und</div>
            </div>
        `;
    }).join('');

    // Alerta de Meta (barra de progreso del sidebar derecho)
    const metaTextEl = document.getElementById('metaText');
    const metaProgressEl = document.getElementById('metaProgress');
    if (metaTextEl && metaProgressEl) {
        const pct = expectedPlayers > 0 ? Math.round((participants.length / expectedPlayers) * 100) : 0;
        metaProgressEl.style.width = Math.min(pct, 100) + '%';
        if (participants.length >= expectedPlayers) {
            metaTextEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Meta de <strong>' + expectedPlayers + ' jugadores</strong> alcanzada.';
            const alertBox = metaTextEl.closest('.rs-alert');
            if (alertBox) { alertBox.style.background = '#f0fdf4'; alertBox.style.borderColor = '#bbf7d0'; alertBox.style.color = '#166534'; }
        } else {
            const diff = expectedPlayers - participants.length;
            metaTextEl.innerHTML = 'Faltan <strong>' + diff + ' jugadores</strong> para la meta de ' + expectedPlayers + '.';
            const alertBox = metaTextEl.closest('.rs-alert');
            if (alertBox) { alertBox.style.background = '#fffbeb'; alertBox.style.borderColor = '#fde68a'; alertBox.style.color = '#92400e'; }
        }
    }

    // Renderizar Alertas (si el contenedor existe)
    if (alertsContainerEl) {
        alertsContainerEl.innerHTML = alerts.map(a => `
            <div class="alert alert-${a.type === 'danger' ? 'danger' : 'warning'}" style="${a.type==='success' ? 'background:#D1FAE5; color:#065F46; border:1px solid #10B981;' : ''}">
                <i class="fa-solid ${a.icon} mt-1"></i>
                <div>${a.msg}</div>
            </div>
        `).join('');
    }

    renderPriceSummary();
}

// Resumen de Precios con Cálculos Dinámicos
function renderPriceSummary() {
    const container = document.getElementById('priceSummaryContainer');
    if (!container) return;

    const prod = orderConfig.producto || 'conjunto';

    let countConjuntos = 0;
    let countCamisetas = 0;
    let totCobrado = 0;

    participants.forEach(p => {
        const pType = p.productType || (prod === 'mixto' ? 'conjunto' : prod) || 'conjunto';
        const pPrice = (pType === 'conjunto') ? unitPriceConjunto : unitPriceCamiseta;
        if (pType === 'conjunto') countConjuntos++;
        else countCamisetas++;

        if (p.paymentStatus === 'Pagado') totCobrado += pPrice;
        else if (p.paymentStatus === 'Abonado') totCobrado += (pPrice * 0.5);
    });

    const subtotalConjuntos = countConjuntos * unitPriceConjunto;
    const subtotalCamisetas = countCamisetas * unitPriceCamiseta;
    const granTotal = subtotalConjuntos + subtotalCamisetas;
    const totSaldo = Math.max(0, granTotal - totCobrado);
    const totalPrendas = countConjuntos + countCamisetas;

    if (totalPrendas === 0) {
        container.innerHTML = `<div class="rs-price-empty"><p class="text-muted" style="font-size:0.8rem; margin:0;">Sin participantes registrados.</p></div>`;
        return;
    }

    let rowsHtml = '';
    if (prod === 'conjunto' || (prod === 'mixto' && countConjuntos > 0) || (prod === 'mixto' && countCamisetas === 0)) {
        rowsHtml += `
            <div class="rs-price-row">
                <span class="rs-price-key">👕🩳 Conjuntos</span>
                <span>${countConjuntos} × S/ ${unitPriceConjunto.toFixed(2)}</span>
                <span class="rs-price-val">S/ ${subtotalConjuntos.toFixed(2)}</span>
            </div>
        `;
    }

    if (prod === 'camiseta' || (prod === 'mixto' && countCamisetas > 0) || (prod === 'mixto' && countConjuntos === 0)) {
        rowsHtml += `
            <div class="rs-price-row">
                <span class="rs-price-key">👕 Solo Camisetas</span>
                <span>${countCamisetas} × S/ ${unitPriceCamiseta.toFixed(2)}</span>
                <span class="rs-price-val">S/ ${subtotalCamisetas.toFixed(2)}</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="rs-price-box">
            ${rowsHtml}
            <div class="rs-price-total">
                <span>Total Estimado (${totalPrendas} prenda${totalPrendas !== 1 ? 's' : ''})</span>
                <span class="rs-price-gran">S/ ${granTotal.toFixed(2)}</span>
            </div>
            <div style="border-top: 1px dashed #CBD5E1; margin-top: 6px; padding-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748B;">Cobrado (Abonos/Pagos):</span>
                    <span style="font-weight: 700; color: #16A34A;">S/ ${totCobrado.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748B;">Saldo por Cobrar:</span>
                    <span style="font-weight: 700; color: #DC2626;">S/ ${totSaldo.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

function setRoleUI(isGoalie) {
    const isGoalkeeperInput = document.getElementById('isGoalkeeper');
    const btnRolePlayer = document.getElementById('btnRolePlayer');
    const btnRoleGoalie = document.getElementById('btnRoleGoalie');

    if (isGoalkeeperInput) isGoalkeeperInput.checked = isGoalie;
    if (btnRolePlayer && btnRoleGoalie) {
        if (isGoalie) {
            btnRoleGoalie.className = 'role-btn active-goalie';
            btnRolePlayer.className = 'role-btn';
        } else {
            btnRolePlayer.className = 'role-btn active-player';
            btnRoleGoalie.className = 'role-btn';
        }
    }
}

// Event Listeners
function setupEventListeners() {
    btnAdd.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveParticipant();
    });

    if (btnExport) btnExport.addEventListener('click', exportCSV);
    if (btnCloseList) btnCloseList.addEventListener('click', closeList);
    if (btnSaveExpected) {
        btnSaveExpected.addEventListener('click', () => {
            const val = parseInt(expectedPlayersInput.value);
            if (val > 0) {
                expectedPlayers = val;
                saveParticipantsToStore();
                updateSummary();
                alert(`Meta de jugadores actualizada a ${val}`);
            }
        });
    }

    const btnRolePlayer = document.getElementById('btnRolePlayer');
    const btnRoleGoalie = document.getElementById('btnRoleGoalie');
    if (btnRolePlayer) {
        btnRolePlayer.addEventListener('click', () => setRoleUI(false));
    }
    if (btnRoleGoalie) {
        btnRoleGoalie.addEventListener('click', () => setRoleUI(true));
    }

    // Guardado unificado de configuración del pedido
    const btnSaveOrderConfig = document.getElementById('btnSaveOrderConfig');
    if (btnSaveOrderConfig) {
        btnSaveOrderConfig.addEventListener('click', () => {
            const unitPriceConjuntoInput = document.getElementById('unitPriceConjuntoInput');
            const unitPriceCamisetaInput = document.getElementById('unitPriceCamisetaInput');
            const deliveryDateInput = document.getElementById('deliveryDateInput');
            const expectedPlayersInput = document.getElementById('expectedPlayersInput');

            if (unitPriceConjuntoInput) {
                const val = parseFloat(unitPriceConjuntoInput.value);
                if (!isNaN(val) && val >= 0) unitPriceConjunto = val;
            }
            if (unitPriceCamisetaInput) {
                const val = parseFloat(unitPriceCamisetaInput.value);
                if (!isNaN(val) && val >= 0) unitPriceCamiseta = val;
            }
            if (deliveryDateInput && deliveryDateInput.value) {
                deliveryDate = deliveryDateInput.value;
            }
            if (expectedPlayersInput) {
                const val = parseInt(expectedPlayersInput.value);
                if (val > 0) expectedPlayers = val;
            }

            saveParticipantsToStore();
            updateSummary();
            updateProductViewVisibility();
            const coordDeliveryDateText = document.getElementById('coordDeliveryDateText');
            if (coordDeliveryDateText) coordDeliveryDateText.textContent = formatDateDisplay(deliveryDate);

            alert("✓ Configuración del pedido guardada con éxito.");
        });
    }

    const btnSavePriceConjunto = document.getElementById('btnSavePriceConjunto');
    const unitPriceConjuntoInput = document.getElementById('unitPriceConjuntoInput');
    if (btnSavePriceConjunto && unitPriceConjuntoInput) {
        btnSavePriceConjunto.addEventListener('click', () => {
            const val = parseFloat(unitPriceConjuntoInput.value);
            if (!isNaN(val) && val >= 0) {
                unitPriceConjunto = val;
                saveParticipantsToStore();
                updateSummary();
                updateProductViewVisibility();
                alert(`Precio por conjunto guardado: S/ ${val.toFixed(2)}`);
            }
        });
    }

    const btnSavePriceCamiseta = document.getElementById('btnSavePriceCamiseta');
    const unitPriceCamisetaInput = document.getElementById('unitPriceCamisetaInput');
    if (btnSavePriceCamiseta && unitPriceCamisetaInput) {
        btnSavePriceCamiseta.addEventListener('click', () => {
            const val = parseFloat(unitPriceCamisetaInput.value);
            if (!isNaN(val) && val >= 0) {
                unitPriceCamiseta = val;
                saveParticipantsToStore();
                updateSummary();
                updateProductViewVisibility();
                alert(`Precio por camiseta guardado: S/ ${val.toFixed(2)}`);
            }
        });
    }

    const btnSaveDeliveryDate = document.getElementById('btnSaveDeliveryDate');
    const deliveryDateInput = document.getElementById('deliveryDateInput');
    if (btnSaveDeliveryDate && deliveryDateInput) {
        btnSaveDeliveryDate.addEventListener('click', () => {
            if (deliveryDateInput.value) {
                deliveryDate = deliveryDateInput.value;
                saveParticipantsToStore();
                const coordDeliveryDateText = document.getElementById('coordDeliveryDateText');
                if (coordDeliveryDateText) coordDeliveryDateText.textContent = formatDateDisplay(deliveryDate);
                alert(`Fecha de entrega actualizada a: ${formatDateDisplay(deliveryDate)}`);
            }
        });
    }

    const prodSelect = document.getElementById('productType');
    if (prodSelect) {
        prodSelect.addEventListener('change', (e) => {
            const shortGroup = document.getElementById('shortSizeGroup');
            if (shortGroup) {
                shortGroup.style.display = (e.target.value === 'conjunto') ? 'block' : 'none';
            }
        });
    }

    // Copiar Link del Coordinador (Para el Admin)
    const btnCopyCoordLink = document.getElementById('btnCopyCoordLink');
    if (btnCopyCoordLink) {
        btnCopyCoordLink.addEventListener('click', () => {
            const coordUrl = new URL('vista_coordinador.html?pedido=SUB-00842', window.location.href).href;
            navigator.clipboard.writeText(coordUrl).catch(() => {});
            window.open(coordUrl, '_blank');
        });
    }

    // Copiar Link para Jugadores (Para el Coordinador)
    const btnShareJugadores = document.getElementById('btnShareJugadores');
    if (btnShareJugadores) {
        btnShareJugadores.addEventListener('click', () => {
            const playerUrl = new URL('participante.html?pedido=SUB-00842&tipo=' + (orderConfig.producto || 'conjunto'), window.location.href).href;
            navigator.clipboard.writeText(playerUrl).catch(() => {});
            window.open(playerUrl, '_blank');
        });
    }
}

function exportCSV() {
    if (participants.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }
    const headers = ["ID", "Jugador", "Nombre Camiseta", "Numero", "Talla Arriba", "Talla Abajo", "Arquero", "Producto", "Pago"];
    const rows = participants.map(p => {
        const pType = p.productType || (orderConfig.producto === 'mixto' ? 'conjunto' : orderConfig.producto) || 'conjunto';
        const tallaArriba = p.size;
        const tallaAbajo = (pType === 'conjunto' && p.shortSize) ? p.shortSize : p.size;
        const isArquero = p.isGoalkeeper ? 'SI' : 'NO';
        
        return [p.id, p.playerName, p.shirtName, p.shirtNumber, tallaArriba, tallaAbajo, isArquero, pType, p.paymentStatus].map(col => {
            const val = col === null || col === undefined ? "" : String(col);
            return `"${val.replace(/"/g, '""')}"`;
        }).join(",");
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pedido_SUB-00842.csv";
    link.click();
}

function closeList() {
    const alerts = document.querySelectorAll('#alertsContainer .alert-danger');
    if (alerts.length > 0) {
        alert("No se puede cerrar la lista. Hay inconsistencias críticas (ej. números duplicados sin resolver).");
    } else {
        alert("Lista cerrada con éxito. El pedido avanza a la siguiente fase.");
        const badge = document.querySelector('.status-badge');
        if (badge) {
            badge.textContent = 'Lista Cerrada';
            badge.className = 'status-badge status-cerrado';
            badge.style.backgroundColor = '#FCD34D';
            badge.style.color = '#92400E';
        }
    }
}

function openModal() {
    modalOverlay.classList.add('active');
    const prodRow = document.getElementById('productTypeRow');
    const shortGroup = document.getElementById('shortSizeGroup');
    const prodSelect = document.getElementById('productType');

    if (orderConfig.producto === 'mixto') {
        if (prodRow) prodRow.style.display = 'flex';
        if (prodSelect) prodSelect.value = 'conjunto';
        if (shortGroup) shortGroup.style.display = 'block';
    } else if (orderConfig.producto === 'conjunto') {
        if (prodRow) prodRow.style.display = 'none';
        if (shortGroup) shortGroup.style.display = 'block';
    } else if (orderConfig.producto === 'camiseta') {
        if (prodRow) prodRow.style.display = 'none';
        if (shortGroup) shortGroup.style.display = 'none';
    }
    setRoleUI(false);
    document.getElementById('playerName').focus();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    form.reset();
    setRoleUI(false);
    document.getElementById('allowDuplicateNum').checked = false;
    editingId = null;
    modalTitle.textContent = "Agregar Participante";
}

// Lógica CRUD
async function saveParticipant() {
    const pName = document.getElementById('playerName').value.trim();
    const sName = document.getElementById('shirtName').value.toUpperCase().trim();
    const sNumber = parseInt(document.getElementById('shirtNumber').value);
    const size = document.getElementById('size').value;
    
    let pType = orderConfig.producto || 'conjunto';
    if (orderConfig.producto === 'mixto') {
        const pTypeInput = document.getElementById('productType');
        if (pTypeInput) pType = pTypeInput.value;
    }

    const gCut = document.getElementById('genderCut') ? document.getElementById('genderCut').value : 'Hombre';
    const shortSize = (pType === 'conjunto' && document.getElementById('shortSize')) ? document.getElementById('shortSize').value : '';
    const isGoalie = document.getElementById('isGoalkeeper') ? document.getElementById('isGoalkeeper').checked : false;
    const allowDuplicate = document.getElementById('allowDuplicateNum').checked;
    const pStatus = document.getElementById('paymentStatus') ? document.getElementById('paymentStatus').value : 'Pendiente';

    if (sName === "") {
        alert("El nombre de la camiseta no puede estar vacío");
        return;
    }

    try {
        const url = editingId ? \`/api/participantes/\${editingId}\` : \`/api/participantes\`;
        const method = editingId ? 'PUT' : 'POST';
        
        const payload = {
            id_pedido: ID_PEDIDO,
            nombre_jugador: pName,
            nombre_camiseta: sName,
            numero_camiseta: sNumber,
            talla_camiseta: size,
            talla_short: shortSize || null,
            genero_corte: gCut,
            tipo_producto: pType,
            es_arquero: isGoalie,
            estado_pago: pStatus
        };

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (!res.ok) {
            alert(\`Error: \${result.error}\`);
            return;
        }

        // Recargar desde la BD y renderizar
        await loadParticipants();
        closeModal();
        renderTable();
        updateSummary();
        
    } catch(e) {
        console.error(e);
        alert('Ocurrió un error al guardar en la base de datos.');
    }
}

window.editParticipant = function(id) {
    const p = participants.find(p => p.id === id);
    if (!p) return;

    editingId = p.id;
    document.getElementById('participantId').value = p.id;
    document.getElementById('playerName').value = p.playerName;
    document.getElementById('shirtName').value = p.shirtName;
    document.getElementById('shirtNumber').value = p.shirtNumber;
    document.getElementById('size').value = p.size;
    if(p.genderCut && document.getElementById('genderCut')) document.getElementById('genderCut').value = p.genderCut;
    
    const currentPType = p.productType || (orderConfig.producto === 'mixto' ? 'conjunto' : orderConfig.producto) || 'conjunto';

    const prodRow = document.getElementById('productTypeRow');
    const prodSelect = document.getElementById('productType');
    const shortGroup = document.getElementById('shortSizeGroup');

    if (orderConfig.producto === 'mixto') {
        if (prodRow) prodRow.style.display = 'flex';
        if (prodSelect) prodSelect.value = currentPType;
        if (shortGroup) shortGroup.style.display = (currentPType === 'conjunto') ? 'block' : 'none';
    } else if (orderConfig.producto === 'conjunto') {
        if (prodRow) prodRow.style.display = 'none';
        if (shortGroup) shortGroup.style.display = 'block';
    } else if (orderConfig.producto === 'camiseta') {
        if (prodRow) prodRow.style.display = 'none';
        if (shortGroup) shortGroup.style.display = 'none';
    }

    if(document.getElementById('shortSize')) document.getElementById('shortSize').value = p.shortSize || '';
    setRoleUI(p.isGoalkeeper || false);
    
    if(document.getElementById('paymentStatus')) document.getElementById('paymentStatus').value = p.paymentStatus || 'Pendiente';
    if(document.getElementById('exceptions')) document.getElementById('exceptions').value = p.exceptions || '';
    document.getElementById('allowDuplicateNum').checked = false;

    modalTitle.textContent = "Editar Participante";
    modalOverlay.classList.add('active');
};

window.deleteParticipant = function(id) {
    if (confirm("¿Eliminar este participante?")) {
        participants = participants.filter(p => p.id !== id);
        saveParticipantsToStore();
        renderTable();
        updateSummary();
    }
};

// Arrancar app
document.addEventListener('DOMContentLoaded', init);
