const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 80;

app.use(cors());
app.use(express.json());

// ==========================================
// API REST - PEDIDOS Y PARTICIPANTES
// ==========================================

// Obtener participantes de un pedido
app.get('/api/pedidos/:id/participantes', async (req, res) => {
    try {
        const participantes = await prisma.participante.findMany({
            where: { id_pedido: req.params.id }
        });
        
        // Prisma tiene problemas con JSON.stringify y BigInt, convertimos a string
        const serialized = participantes.map(p => ({
            ...p,
            id: p.id.toString()
        }));
        
        res.json(serialized);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los participantes' });
    }
});

// Guardar un nuevo participante (Jugador registrándose)
app.post('/api/participantes', async (req, res) => {
    try {
        const data = req.body;
        // Validación de unicidad de número a nivel de base de datos la manejará Prisma (arrojará un error)
        const nuevoParticipante = await prisma.participante.create({
            data: {
                id_pedido: data.id_pedido,
                nombre_jugador: data.nombre_jugador,
                nombre_camiseta: data.nombre_camiseta,
                numero_camiseta: parseInt(data.numero_camiseta),
                talla_camiseta: data.talla_camiseta,
                talla_short: data.talla_short || null,
                genero_corte: data.genero_corte || 'Hombre',
                tipo_producto: data.tipo_producto || 'camiseta',
                es_arquero: data.es_arquero === true || data.es_arquero === 'true',
                estado_pago: 'Pendiente',
                permite_numero_duplicado: false,
                fecha_registro: new Date()
            }
        });
        res.status(201).json({ ...nuevoParticipante, id: nuevoParticipante.id.toString() });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El número de camiseta ya existe en este pedido.' });
        }
        res.status(500).json({ error: 'Error al guardar el participante' });
    }
});

// Actualizar participante (para uso del coordinador)
app.put('/api/participantes/:id', async (req, res) => {
    try {
        const id = BigInt(req.params.id);
        const data = req.body;
        const actualizado = await prisma.participante.update({
            where: { id: id },
            data: data
        });
        // Prisma tiene problemas serializando BigInt a JSON directo, convertimos a string
        res.json({ ...actualizado, id: actualizado.id.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el participante' });
    }
});

// ==========================================
// SERVIR FRONTEND ESTÁTICO
// ==========================================
// Servir la carpeta raíz para el redireccionador (index.html)
app.use(express.static(__dirname));

// Servir la carpeta mvp_pedidos
app.use('/mvp_pedidos', express.static(path.join(__dirname, 'mvp_pedidos')));

app.listen(port, () => {
    console.log(`Servidor Backend de SIPES iniciado en el puerto ${port}`);
});
