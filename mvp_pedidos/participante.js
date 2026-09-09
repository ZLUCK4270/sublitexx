// participante.js - Lógica para la vista móvil del participante
const form = document.getElementById('playerForm');
const alertsContainer = document.getElementById('alertsContainer');
const ID_PEDIDO = 'SUB-00842'; // Hardcoded for MVP

// Cargar participante por ID (si está editando)
async function loadParticipantForEdit(id) {
    try {
        const response = await fetch(`/api/pedidos/${ID_PEDIDO}/participantes`);
        if (!response.ok) throw new Error('Error al cargar participantes');
        const participants = await response.json();
        const p = participants.find(p => p.id === id);
        if (p) {
            document.getElementById('participantId').value = p.id;
            document.getElementById('playerName').value = p.nombre_jugador || p.playerName || '';
            document.getElementById('shirtName').value = p.nombre_camiseta || p.shirtName || '';
            document.getElementById('shirtNumber').value = p.numero_camiseta || p.shirtNumber || '';
            document.getElementById('size').value = p.talla_camiseta || p.size || 'M';
            document.getElementById('productType').value = p.tipo_producto || p.productType || 'conjunto';
            if(p.genero_corte) document.getElementById('genderCut').value = p.genero_corte;
            if(p.talla_short) document.getElementById('shortSize').value = p.talla_short;
            if(p.es_arquero !== undefined) document.getElementById('isGoalkeeper').checked = p.es_arquero;
            
            // Trigger change event to setup UI correctly
            const prodSelect = document.getElementById('productType');
            if(prodSelect) prodSelect.dispatchEvent(new Event('change'));
        }
    } catch (e) {
        console.error(e);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Si la URL tiene un parámetro ?id=X, simulamos que el usuario está editando su registro.
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    // Toggle Short Size visibility
    const prodSelect = document.getElementById('productType');
    const shortGroup = document.getElementById('shortSizeGroup');
    if (prodSelect) {
        prodSelect.addEventListener('change', () => {
            if(shortGroup) shortGroup.style.display = prodSelect.value === 'conjunto' ? 'block' : 'none';
            if(prodSelect.value !== 'conjunto') {
                const ss = document.getElementById('shortSize');
                if(ss) ss.value = '';
            }
        });
        prodSelect.dispatchEvent(new Event('change'));
    }

    if (id) {
        loadParticipantForEdit(id);
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idField = document.getElementById('participantId').value;
    const pName = document.getElementById('playerName').value.trim();
    const sName = document.getElementById('shirtName').value.toUpperCase().trim();
    const sNumber = parseInt(document.getElementById('shirtNumber').value);
    const size = document.getElementById('size').value;
    const pType = document.getElementById('productType').value;
    const gCut = document.getElementById('genderCut') ? document.getElementById('genderCut').value : 'Hombre';
    const shortSize = document.getElementById('shortSize') ? document.getElementById('shortSize').value : null;
    const isGoalie = document.getElementById('isGoalkeeper') ? document.getElementById('isGoalkeeper').checked : false;
    
    if (sName === "") {
        alert("El nombre de la camiseta no puede estar vacío");
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const oldText = submitBtn.textContent;
    submitBtn.textContent = 'Guardando...';
    submitBtn.disabled = true;

    try {
        const url = idField ? `/api/participantes/${idField}` : `/api/participantes`;
        const method = idField ? 'PUT' : 'POST';
        
        const payload = {
            id_pedido: ID_PEDIDO,
            nombre_jugador: pName,
            nombre_camiseta: sName,
            numero_camiseta: sNumber,
            talla_camiseta: size,
            talla_short: shortSize || null,
            genero_corte: gCut,
            tipo_producto: pType,
            es_arquero: isGoalie
        };

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (!res.ok) {
            if (result.error) {
                alertsContainer.innerHTML = `
                    <div class="alert alert-danger" style="margin-bottom: 1rem;">
                        <i class="fa-solid fa-triangle-exclamation mt-1"></i>
                        <div><strong>Error:</strong> ${result.error}</div>
                    </div>`;
            } else {
                throw new Error('Error al guardar');
            }
            submitBtn.textContent = oldText;
            submitBtn.disabled = false;
            return;
        }

        // Ocultar form y mostrar recibo
        form.style.display = 'none';
        let summaryText = `(Talla ${size}, Corte ${gCut})`;
        if (pType === 'conjunto' && shortSize) {
            summaryText = `(Camiseta ${size}, Short ${shortSize}, Corte ${gCut})`;
        }
        if (isGoalie) summaryText += ` - <strong>Arquero</strong>`;

        alertsContainer.innerHTML = `
            <div class="alert alert-success" style="margin-bottom: 1.5rem; background:#D1FAE5; color:#065F46; border:1px solid #10B981; padding: 1.5rem;">
                <div style="text-align: center; width: 100%;">
                    <i class="fa-solid fa-check-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">¡Pedido Confirmado!</h3>
                    <p>Tu uniforme quedó registrado con el nombre <strong>${sName}</strong> y número <strong>${sNumber}</strong> <br>${summaryText}</p>
                    <button class="btn btn-outline" style="margin-top: 1rem;" onclick="location.reload()">Editar mis datos / Ingresar Nuevo</button>
                </div>
            </div>`;
    } catch (err) {
        console.error(err);
        alert('Ocurrió un error al guardar. Revisa tu conexión.');
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;
    }
});
