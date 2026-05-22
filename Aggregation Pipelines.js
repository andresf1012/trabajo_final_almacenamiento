use("base_datos_docu");

// -----------------------------------------------------------------------------
// AGREGACION 1
// Ocupacion por facultad: total de reservas, horas reservadas y distribucion
// por estado (Activa / Ajustada / Cancelada).
// -----------------------------------------------------------------------------
print("\n=== AGREGACION 1: Ocupacion por facultad ===");
db.reservas.aggregate([
  {
    $addFields: {
      fechaInicioDate: { $toDate: "$fechaInicio" },
      fechaFinDate: { $toDate: "$fechaFin" }
    }
  },
  {
    $addFields: {
      duracionHoras: {
        $divide: [{ $subtract: ["$fechaFinDate", "$fechaInicioDate"] }, 1000 * 60 * 60]
      }
    }
  },
  {
    $lookup: {
      from: "salas",
      localField: "idSala",
      foreignField: "_id",
      as: "sala"
    }
  },
  { $unwind: "$sala" },
  {
    $lookup: {
      from: "facultades",
      localField: "sala.idFacultad",
      foreignField: "_id",
      as: "facultad"
    }
  },
  { $unwind: "$facultad" },
  {
    $group: {
      _id: "$facultad.nombre",
      totalReservas: { $sum: 1 },
      horasReservadas: { $sum: "$duracionHoras" },
      activas: { $sum: { $cond: [{ $eq: ["$estado", "Activa"] }, 1, 0] } },
      ajustadas: { $sum: { $cond: [{ $eq: ["$estado", "Ajustada"] }, 1, 0] } },
      canceladas: { $sum: { $cond: [{ $eq: ["$estado", "Cancelada"] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      facultad: "$_id",
      totalReservas: 1,
      horasReservadas: { $round: ["$horasReservadas", 2] },
      activas: 1,
      ajustadas: 1,
      canceladas: 1,
      tasaCancelacionPct: {
        $round: [
          {
            $multiply: [
              { $divide: ["$canceladas", { $max: ["$totalReservas", 1] }] },
              100
            ]
          },
          2
        ]
      }
    }
  },
  { $sort: { horasReservadas: -1 } }
]).forEach(printjson);

// -----------------------------------------------------------------------------
// AGREGACION 2
// Top usuarios por uso de salas (solo reservas Activa/Ajustada) con detalle de
// facultad, rol y horas acumuladas.
// -----------------------------------------------------------------------------
print("\n=== AGREGACION 2: Top usuarios por uso de salas ===");
db.reservas.aggregate([
  { $match: { estado: { $in: ["Activa", "Ajustada"] } } },
  {
    $addFields: {
      duracionHoras: {
        $divide: [
          { $subtract: [{ $toDate: "$fechaFin" }, { $toDate: "$fechaInicio" }] },
          1000 * 60 * 60
        ]
      }
    }
  },
  {
    $group: {
      _id: "$idUsuario",
      reservasEfectivas: { $sum: 1 },
      horasTotales: { $sum: "$duracionHoras" }
    }
  },
  {
    $lookup: {
      from: "usuarios",
      localField: "_id",
      foreignField: "_id",
      as: "usuario"
    }
  },
  { $unwind: "$usuario" },
  {
    $lookup: {
      from: "facultades",
      localField: "usuario.idFacultad",
      foreignField: "_id",
      as: "facultad"
    }
  },
  { $unwind: "$facultad" },
  {
    $project: {
      _id: 0,
      codigoUsuario: "$usuario.codigoUsuario",
      nombreCompleto: "$usuario.nombreCompleto",
      rol: "$usuario.rol",
      estadoUsuario: "$usuario.estado",
      facultad: "$facultad.nombre",
      reservasEfectivas: 1,
      horasTotales: { $round: ["$horasTotales", 2] }
    }
  },
  { $sort: { horasTotales: -1, reservasEfectivas: -1 } },
  { $limit: 10 }
]).forEach(printjson);

// -----------------------------------------------------------------------------
// AGREGACION 3
// Distribucion de demanda por franja horaria y dia de semana.
// -----------------------------------------------------------------------------
print("\n=== AGREGACION 3: Demanda por franja horaria y dia ===");
db.reservas.aggregate([
  {
    $addFields: {
      inicioDate: { $toDate: "$fechaInicio" },
      horaInicio: { $hour: { date: { $toDate: "$fechaInicio" }, timezone: "UTC" } },
      diaSemanaNum: { $isoDayOfWeek: { $toDate: "$fechaInicio" } }
    }
  },
  {
    $addFields: {
      franja: {
        $switch: {
          branches: [
            { case: { $and: [{ $gte: ["$horaInicio", 7] }, { $lt: ["$horaInicio", 12] }] }, then: "Manana (07-11)" },
            { case: { $and: [{ $gte: ["$horaInicio", 12] }, { $lt: ["$horaInicio", 18] }] }, then: "Tarde (12-17)" },
            { case: { $and: [{ $gte: ["$horaInicio", 18] }, { $lte: ["$horaInicio", 21] }] }, then: "Noche (18-21)" }
          ],
          default: "Fuera de horario"
        }
      },
      diaSemana: {
        $switch: {
          branches: [
            { case: { $eq: ["$diaSemanaNum", 1] }, then: "Lunes" },
            { case: { $eq: ["$diaSemanaNum", 2] }, then: "Martes" },
            { case: { $eq: ["$diaSemanaNum", 3] }, then: "Miercoles" },
            { case: { $eq: ["$diaSemanaNum", 4] }, then: "Jueves" },
            { case: { $eq: ["$diaSemanaNum", 5] }, then: "Viernes" },
            { case: { $eq: ["$diaSemanaNum", 6] }, then: "Sabado" },
            { case: { $eq: ["$diaSemanaNum", 7] }, then: "Domingo" }
          ],
          default: "Sin dia"
        }
      }
    }
  },
  {
    $group: {
      _id: { diaSemana: "$diaSemana", franja: "$franja" },
      totalReservas: { $sum: 1 },
      activas: { $sum: { $cond: [{ $eq: ["$estado", "Activa"] }, 1, 0] } },
      canceladas: { $sum: { $cond: [{ $eq: ["$estado", "Cancelada"] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      diaSemana: "$_id.diaSemana",
      franja: "$_id.franja",
      totalReservas: 1,
      activas: 1,
      canceladas: 1
    }
  },
  { $sort: { diaSemana: 1, franja: 1 } }
]).forEach(printjson);

// -----------------------------------------------------------------------------
// AGREGACION 4
// Auditoria: cantidad de modificaciones por usuario, tipo de evento y coleccion.
// -----------------------------------------------------------------------------
print("\n=== AGREGACION 4: Auditoria por usuario y tipo de cambio ===");
db.registrosModificaciones.aggregate([
  {
    $lookup: {
      from: "usuarios",
      localField: "idUsuario",
      foreignField: "_id",
      as: "usuario"
    }
  },
  { $unwind: "$usuario" },
  {
    $lookup: {
      from: "facultades",
      localField: "usuario.idFacultad",
      foreignField: "_id",
      as: "facultad"
    }
  },
  { $unwind: "$facultad" },
  {
    $group: {
      _id: {
        usuario: "$usuario.nombreCompleto",
        rol: "$usuario.rol",
        facultad: "$facultad.nombre",
        coleccion: "$coleccion",
        tipo: "$tipo"
      },
      totalEventos: { $sum: 1 },
      primeraFecha: { $min: { $toDate: "$fecha" } },
      ultimaFecha: { $max: { $toDate: "$fecha" } }
    }
  },
  {
    $project: {
      _id: 0,
      usuario: "$_id.usuario",
      rol: "$_id.rol",
      facultad: "$_id.facultad",
      coleccion: "$_id.coleccion",
      tipoEvento: "$_id.tipo",
      totalEventos: 1,
      primeraFecha: 1,
      ultimaFecha: 1
    }
  },
  { $sort: { totalEventos: -1, usuario: 1 } }
]).forEach(printjson);

// -----------------------------------------------------------------------------
// AGREGACION 5
// Analisis de eficiencia operativa por reserva: antelacion de creacion, duracion,
// y tiempo de reaccion en ajustes (cuando exista ultimaModificacion).
// -----------------------------------------------------------------------------
print("\n=== AGREGACION 5: Eficiencia operativa de reservas ===");
db.reservas.aggregate([
  {
    $addFields: {
      fechaInicioDate: { $toDate: "$fechaInicio" },
      fechaFinDate: { $toDate: "$fechaFin" },
      fechaCreacionDate: { $toDate: "$fechaCreacion" },
      fechaUltModDate: {
        $cond: [
          { $ifNull: ["$ultimaModificacion.fecha", false] },
          { $toDate: "$ultimaModificacion.fecha" },
          null
        ]
      }
    }
  },
  {
    $addFields: {
      antelacionHoras: {
        $divide: [{ $subtract: ["$fechaInicioDate", "$fechaCreacionDate"] }, 1000 * 60 * 60]
      },
      duracionHoras: {
        $divide: [{ $subtract: ["$fechaFinDate", "$fechaInicioDate"] }, 1000 * 60 * 60]
      },
      reaccionAjusteHoras: {
        $cond: [
          { $ifNull: ["$fechaUltModDate", false] },
          { $divide: [{ $subtract: ["$fechaUltModDate", "$fechaCreacionDate"] }, 1000 * 60 * 60] },
          null
        ]
      }
    }
  },
  {
    $group: {
      _id: "$estado",
      totalReservas: { $sum: 1 },
      antelacionPromedioHoras: { $avg: "$antelacionHoras" },
      duracionPromedioHoras: { $avg: "$duracionHoras" },
      reaccionPromedioAjustesHoras: { $avg: "$reaccionAjusteHoras" }
    }
  },
  {
    $project: {
      _id: 0,
      estadoReserva: "$_id",
      totalReservas: 1,
      antelacionPromedioHoras: { $round: ["$antelacionPromedioHoras", 2] },
      duracionPromedioHoras: { $round: ["$duracionPromedioHoras", 2] },
      reaccionPromedioAjustesHoras: { $round: ["$reaccionPromedioAjustesHoras", 2] }
    }
  },
  { $sort: { totalReservas: -1 } }
]).forEach(printjson);
