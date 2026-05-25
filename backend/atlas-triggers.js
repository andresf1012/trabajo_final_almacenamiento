/*
 * ATLAS TRIGGERS — Sistema de Reservas de Salas por Facultad
 *
 * Estos triggers se configuran en MongoDB Atlas UI:
 * Atlas → App Services → Triggers → Add Trigger
 *
 * Cada función se copia en el editor de código del trigger correspondiente.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 1: Auditoría automática de cancelaciones
// ─────────────────────────────────────────────────────────────────────────────
// Configuración en Atlas:
//   - Trigger Type: Database
//   - Cluster: (tu cluster)
//   - Database: base_datos_docu
//   - Collection: reservas
//   - Operation Type: Update Document
//   - Full Document: ON
//   - Full Document Before Change: ON
//
// Objetivo: Registrar automáticamente en registrosModificaciones cada vez que
// una reserva cambia de estado a "Cancelada", garantizando trazabilidad
// completa sin depender del backend.
exports.trigger_auditoria_cancelacion = function (changeEvent) {
  const fullDoc = changeEvent.fullDocument;
  const docBefore = changeEvent.fullDocumentBeforeChange;

  if (!docBefore || !fullDoc) return;
  if (fullDoc.estado !== "Cancelada" || docBefore.estado === "Cancelada") return;

  const mongodb = context.services.get("mongodb-atlas");
  const registros = mongodb
    .db("base_datos_docu")
    .collection("registrosModificaciones");

  return registros.insertOne({
    idDocumentoModificado: fullDoc._id,
    coleccion: "reservas",
    tipo: "cancelacion",
    fecha: new Date(),
    descripcion: `Reserva cancelada — estado cambió de "${docBefore.estado}" a "Cancelada"`,
    idUsuario: fullDoc.ultimaModificacion
      ? fullDoc.ultimaModificacion.idUsuarioResponsable
      : fullDoc.idUsuario,
    datosModificacion: {
      campoModificado: "estado",
      valorAnterior: docBefore.estado,
      valorNuevo: "Cancelada",
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 2: Auditoría de cambios de estado de salas
// ─────────────────────────────────────────────────────────────────────────────
// Configuración en Atlas:
//   - Collection: salas
//   - Operation Type: Update Document
//   - Full Document: ON
//   - Full Document Before Change: ON
//
// Objetivo: Registrar cada vez que una sala es habilitada o deshabilitada,
// permitiendo tener un historial completo de disponibilidad de salas.
exports.trigger_cambio_estado_sala = function (changeEvent) {
  const fullDoc = changeEvent.fullDocument;
  const docBefore = changeEvent.fullDocumentBeforeChange;

  if (!docBefore || !fullDoc) return;
  if (fullDoc.estado === docBefore.estado) return;

  const mongodb = context.services.get("mongodb-atlas");
  const registros = mongodb
    .db("base_datos_docu")
    .collection("registrosModificaciones");
  const salas = mongodb.db("base_datos_docu").collection("salas");

  return registros.insertOne({
    idDocumentoModificado: fullDoc._id,
    coleccion: "salas",
    tipo: "cambioEstadoSala",
    fecha: new Date(),
    descripcion: `Sala "${fullDoc.nombre}" cambió de "${docBefore.estado}" a "${fullDoc.estado}"`,
    idUsuario: context.user
      ? new BSON.ObjectId(context.user.id)
      : fullDoc._id,
    datosModificacion: {
      campoModificado: "estado",
      valorAnterior: docBefore.estado,
      valorNuevo: fullDoc.estado,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 3: Cancelación automática de reservas al deshabilitar una sala
// ─────────────────────────────────────────────────────────────────────────────
// Configuración en Atlas:
//   - Collection: salas
//   - Operation Type: Update Document
//   - Full Document: ON
//   - Full Document Before Change: ON
//
// Objetivo: Garantizar integridad de datos — si una sala se deshabilita,
// todas sus reservas futuras activas deben cancelarse automáticamente
// para evitar inconsistencias en la disponibilidad.
exports.trigger_cancelar_reservas_sala_deshabilitada = function (changeEvent) {
  const fullDoc = changeEvent.fullDocument;
  const docBefore = changeEvent.fullDocumentBeforeChange;

  if (!docBefore || !fullDoc) return;
  if (fullDoc.estado !== "Deshabilitada" || docBefore.estado !== "Habilitada")
    return;

  const mongodb = context.services.get("mongodb-atlas");
  const reservas = mongodb.db("base_datos_docu").collection("reservas");

  return reservas.updateMany(
    {
      idSala: fullDoc._id,
      estado: { $in: ["Activa", "Ajustada"] },
      fechaInicio: { $gte: new Date() },
    },
    {
      $set: {
        estado: "Cancelada",
        "ultimaModificacion.fecha": new Date(),
      },
    }
  );
};
