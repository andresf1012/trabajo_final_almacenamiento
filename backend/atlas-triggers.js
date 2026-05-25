/*
 * TRIGGERS E ÍNDICES — Sistema de Reservas de Salas por Facultad
 *
 * Estos scripts se ejecutan en MongoDB Atlas:
 *   - Triggers: Atlas → App Services → Triggers → Add Trigger (Function editor)
 *   - Scripts de validación: Atlas → Collections → Aggregations / mongosh
 */

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 1: tg_validar_horario_reserva
// ─────────────────────────────────────────────────────────────────────────────
// Objetivo: Detectar reservas que estén fuera del horario institucional
// permitido (7:00 a.m. – 9:30 p.m. hora Colombia UTC-5). Garantiza que
// ningún documento quede registrado con horarios inválidos.
//
// Configuración en Atlas App Services:
//   Trigger Type: Database | Collection: reservas | Event: Insert/Update
// ─────────────────────────────────────────────────────────────────────────────
const tg_validar_horario_reserva = `
db.reservas.aggregate([
  {
    $addFields: {
      horaInicio: { $hour: { date: { $toDate: "$fechaInicio" }, timezone: "-05:00" } },
      minutoInicio: { $minute: { date: { $toDate: "$fechaInicio" }, timezone: "-05:00" } },
      horaFin: { $hour: { date: { $toDate: "$fechaFin" }, timezone: "-05:00" } },
      minutoFin: { $minute: { date: { $toDate: "$fechaFin" }, timezone: "-05:00" } }
    }
  },
  {
    $match: {
      $or: [
        { horaInicio: { $lt: 7 } },
        { horaFin: { $gt: 21 } },
        { $and: [{ horaFin: { $eq: 21 } }, { minutoFin: { $gt: 30 } }] }
      ]
    }
  },
  {
    $project: {
      _id: 1,
      fechaInicio: 1,
      fechaFin: 1,
      motivoError: {
        $literal: "Error: Las reservas solo se permiten entre las 7:00 a.m. y las 9:30 p.m."
      }
    }
  }
]).forEach(printjson);
`;

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 2: tg_evitar_solapamiento
// ─────────────────────────────────────────────────────────────────────────────
// Objetivo: Detectar reservas en conflicto — dos o más reservas activas
// sobre la misma sala con solapamiento temporal. Garantiza la integridad
// de disponibilidad de salas en toda la base de datos.
//
// Configuración en Atlas App Services:
//   Trigger Type: Database | Collection: reservas | Event: Insert/Update
// ─────────────────────────────────────────────────────────────────────────────
const tg_evitar_solapamiento = `
db.reservas.aggregate([
  {
    $match: {
      estado: { $in: ["Activa", "Ajustada"] }
    }
  },
  {
    $lookup: {
      from: "reservas",
      let: {
        idReservaActual: "$_id",
        salaId: "$idSala",
        inicioActual: { $toDate: "$fechaInicio" },
        finActual: { $toDate: "$fechaFin" }
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$idSala", "$$salaId"] },
                { $ne: ["$_id", "$$idReservaActual"] },
                { $in: ["$estado", ["Activa", "Ajustada"]] },
                { $lt: [{ $toDate: "$fechaInicio" }, "$$finActual"] },
                { $gt: [{ $toDate: "$fechaFin" }, "$$inicioActual"] }
              ]
            }
          }
        }
      ],
      as: "reservasConflictivas"
    }
  },
  {
    $match: {
      "reservasConflictivas.0": { $exists: true }
    }
  },
  {
    $project: {
      _id: 1,
      idSala: 1,
      fechaInicio: 1,
      fechaFin: 1,
      idReservasQueChocan: "$reservasConflictivas._id",
      motivoError: {
        $literal: "Error: La sala ya cuenta con una reserva en ese horario."
      }
    }
  }
]).forEach(printjson);
`;

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 3: sp_crear_reserva
// ─────────────────────────────────────────────────────────────────────────────
// Objetivo: Procedimiento completo para crear una reserva validando todas
// las reglas de negocio: sala habilitada, usuario activo de la misma
// facultad, horario institucional y sin solapamiento. Si todas las
// validaciones pasan, inserta el documento en la colección reservas.
//
// Uso: reemplaza "ID_DE_LA_SALA" e "ID_DEL_USUARIO" por los ObjectId reales.
// ─────────────────────────────────────────────────────────────────────────────
const sp_crear_reserva = `
const parametro_idSala    = ObjectId("ID_DE_LA_SALA");
const parametro_idUsuario = ObjectId("ID_DEL_USUARIO");
const parametro_inicio    = ISODate("2026-05-26T14:00:00.000Z");
const parametro_fin       = ISODate("2026-05-26T16:00:00.000Z");
const parametro_tipo      = "Academica";
const parametro_desc      = "Reunión de comité curricular";

// 1. Validar sala habilitada
const sala = db.salas.findOne({ _id: parametro_idSala });
if (!sala) { print("Error: Sala no encontrada."); quit(); }
if (sala.estado !== "Habilitada") { print("Error: La sala está deshabilitada."); quit(); }

// 2. Validar usuario activo
const usuario = db.usuarios.findOne({ _id: parametro_idUsuario });
if (!usuario) { print("Error: Usuario no encontrado."); quit(); }
if (usuario.estado !== "Activo") { print("Error: El usuario está inactivo."); quit(); }

// 3. Validar que usuario y sala pertenezcan a la misma facultad
if (sala.idFacultad.toString() !== usuario.idFacultad.toString()) {
  print("Error: El usuario solo puede reservar salas de su propia facultad."); quit();
}

// 4. Validar horario institucional (7:00 a.m. – 9:30 p.m. Colombia UTC-5)
const horaInicio = parametro_inicio.getUTCHours() - 5;
const horaFin    = parametro_fin.getUTCHours() - 5;
const minFin     = parametro_fin.getUTCMinutes();
if (horaInicio < 7 || horaFin > 21 || (horaFin === 21 && minFin > 30) || parametro_fin <= parametro_inicio) {
  print("Error: La reserva debe estar dentro del horario institucional (7:00 a.m. - 9:30 p.m.)."); quit();
}

// 5. Validar solapamiento
const conflicto = db.reservas.findOne({
  idSala: parametro_idSala,
  estado: { $in: ["Activa", "Ajustada"] },
  fechaInicio: { $lt: parametro_fin },
  fechaFin:    { $gt: parametro_inicio }
});
if (conflicto) { print("Error: La sala ya tiene una reserva en ese horario."); quit(); }

// 6. Crear la reserva
const resultado = db.reservas.insertOne({
  idSala:       parametro_idSala,
  idUsuario:    parametro_idUsuario,
  fechaInicio:  parametro_inicio,
  fechaFin:     parametro_fin,
  estado:       "Activa",
  tipoEvento:   parametro_tipo,
  descripcion:  parametro_desc,
  fechaCreacion: new Date()
});
print("Reserva creada exitosamente con ID: " + resultado.insertedId);
`;

module.exports = { tg_validar_horario_reserva, tg_evitar_solapamiento, sp_crear_reserva };
