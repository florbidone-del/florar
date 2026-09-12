// Servidor mínimo para cobrar por Mercado Pago y confirmar el pago automáticamente.
//
// Qué hace:
//  1) POST /api/generar-link  -> crea un link de pago (Checkout Pro) para un alumno y un mes puntual.
//  2) POST /api/webhook       -> Mercado Pago avisa acá cuando cambia el estado de un pago.
//                                 Si quedó "approved", lo marcamos como pagado.
//  3) GET  /api/estado/:studentId/:mes -> para que el front-end (o vos) consulte si ya está pagado.
//
// Qué NO hace (a propósito): no toca la app de Claude ni su almacenamiento. Esta es una pieza
// aparte, con su propia base de datos (un archivo JSON simple para arrancar). El front-end de
// la app tendría que llamar a este servidor (fetch a /api/estado/...) en vez de, o además de,
// guardar el estado de pago solo en el almacenamiento de la app.
//
// Requisitos: Node 18+ (usa fetch nativo), y un Access Token PRIVADO de Mercado Pago
// (Tus integraciones -> Credenciales de producción -> Access Token). Ese token NUNCA debe
// vivir en el navegador ni en el HTML de la app — por eso hace falta este servidor.

import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET; // opcional pero recomendado
const BASE_URL = process.env.BASE_URL; // ej: https://tu-servidor.onrender.com
const DB_FILE = './db.json';

if (!MP_ACCESS_TOKEN) {
  console.warn('⚠️  Falta MP_ACCESS_TOKEN en el .env — el servidor no va a poder crear cobros.');
}

// ---------- "base de datos" simple en un archivo JSON ----------
// Para un taller esto alcanza. Si más adelante crece mucho, migrar a Postgres/SQLite es
// un cambio acotado a las funciones readDb/writeDb.
function readDb() {
  if (!fs.existsSync(DB_FILE)) return { payments: {} };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---------- crear un link de cobro ----------
// body: { studentId: "julia-gomez", name: "Julia Gómez", amount: 15000, mes: "2026-09" }
app.post('/api/generar-link', async (req, res) => {
  try {
    const { studentId, name, amount, mes } = req.body;
    if (!studentId || !amount || !mes) {
      return res.status(400).json({ error: 'Faltan datos: studentId, amount y mes son obligatorios.' });
    }
    const externalReference = `${studentId}__${mes}`;

    const preference = {
      items: [
        {
          title: `Cuota ${mes} — ${name || studentId}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(amount)
        }
      ],
      external_reference: externalReference,
      notification_url: BASE_URL ? `${BASE_URL}/api/webhook` : undefined,
      back_urls: BASE_URL ? {
        success: `${BASE_URL}/pago-exitoso`,
        pending: `${BASE_URL}/pago-pendiente`,
        failure: `${BASE_URL}/pago-fallido`
      } : undefined,
      auto_return: BASE_URL ? 'approved' : undefined
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });
    const data = await mpRes.json();
    if (!mpRes.ok) {
      console.error('Error de Mercado Pago:', data);
      return res.status(502).json({ error: 'Mercado Pago rechazó la solicitud.', detail: data });
    }

    const db = readDb();
    db.payments[externalReference] = {
      studentId, mes, amount: Number(amount),
      status: 'pending', createdAt: new Date().toISOString()
    };
    writeDb(db);

    res.json({ init_point: data.init_point, externalReference });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno generando el link de pago.' });
  }
});

// ---------- validar la firma del webhook (recomendado en producción) ----------
function isValidSignature(req) {
  if (!MP_WEBHOOK_SECRET) return true; // sin secreto configurado, no valida (solo para pruebas)
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.query['data.id'];
  if (!signature || !dataId) return false;
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('=').map(s => s.trim())));
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const hash = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return hash === parts.v1;
}

// ---------- webhook: acá Mercado Pago nos avisa del pago ----------
app.post('/api/webhook', async (req, res) => {
  // Respondemos rápido y seguimos procesando; MP solo necesita un 200.
  res.sendStatus(200);
  try {
    const type = req.query.type || req.body?.type;
    const dataId = req.query['data.id'] || req.body?.data?.id;
    if (type !== 'payment' || !dataId) return;

    if (!isValidSignature(req)) {
      console.warn('Firma de webhook inválida, se ignora la notificación.');
      return;
    }

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const payment = await payRes.json();
    const externalReference = payment.external_reference;
    if (!externalReference) return;

    const db = readDb();
    if (!db.payments[externalReference]) {
      db.payments[externalReference] = {};
    }
    db.payments[externalReference].status = payment.status; // approved | pending | rejected...
    db.payments[externalReference].mpPaymentId = payment.id;
    db.payments[externalReference].updatedAt = new Date().toISOString();
    writeDb(db);

    console.log(`Pago ${externalReference}: ${payment.status}`);
  } catch (err) {
    console.error('Error procesando webhook:', err);
  }
});

// ---------- consultar estado de pago ----------
app.get('/api/estado/:studentId/:mes', (req, res) => {
  const db = readDb();
  const key = `${req.params.studentId}__${req.params.mes}`;
  const record = db.payments[key];
  if (!record) return res.json({ status: 'sin_registro' });
  res.json(record);
});

app.get('/', (req, res) => res.send('Servidor de cobros del taller — activo.'));

app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
