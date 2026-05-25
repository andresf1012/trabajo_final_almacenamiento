const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const RegistroModificacion = require('../models/RegistroModificacion');

// AGREGACION 1: Ocupación por facultad
// Total reservas, horas reservadas y distribución de estados por facultad
exports.ocupacionFacultad = async (req, res, next) => {
  try {
    const matchFecha = {};
    if (req.query.fechaDesde) matchFecha.fechaInicio = { $gte: new Date(req.query.fechaDesde) };
    if (req.query.fechaHasta) {
      matchFecha.fechaInicio = matchFecha.fechaInicio || {};
      matchFecha.fechaInicio.$lte = new Date(req.query.fechaHasta);
    }

    const resultado = await Reserva.aggregate([
      ...(Object.keys(matchFecha).length ? [{ $match: matchFecha }] : []),
      {
        $lookup: {
          from: 'salas',
          localField: 'idSala',
          foreignField: '_id',
          as: 'sala'
        }
      },
      { $unwind: '$sala' },
      {
        $lookup: {
          from: 'facultades',
          localField: 'sala.idFacultad',
          foreignField: '_id',
          as: 'facultad'
        }
      },
      { $unwind: '$facultad' },
      {
        $group: {
          _id: '$facultad._id',
          nombreFacultad: { $first: '$facultad.nombre' },
          totalReservas: { $sum: 1 },
          horasReservadas: {
            $sum: {
              $divide: [{ $subtract: ['$fechaFin', '$fechaInicio'] }, 3600000]
            }
          },
          reservasActivas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Activa'] }, 1, 0] }
          },
          reservasAjustadas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Ajustada'] }, 1, 0] }
          },
          reservasCanceladas: {
            $sum: { $cond: [{ $eq: ['$estado', 'Cancelada'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          horasReservadas: { $round: ['$horasReservadas', 2] },
          tasaCancelacion: {
            $cond: [
              { $gt: ['$totalReservas', 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ['$reservasCanceladas', '$totalReservas'] }, 100] },
                  2
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { horasReservadas: -1 } }
    ]);

    res.json({ data: resultado, total: resultado.length });
  } catch (error) {
    next(error);
  }
};

// AGREGACION 2: Top 10 usuarios por uso (solo reservas Activa/Ajustada)
exports.topUsuarios = async (req, res, next) => {
  try {
    const matchFecha = { estado: { $in: ['Activa', 'Ajustada'] } };
    if (req.query.fechaDesde) matchFecha.fechaInicio = { $gte: new Date(req.query.fechaDesde) };
    if (req.query.fechaHasta) {
      matchFecha.fechaInicio = matchFecha.fechaInicio || {};
      matchFecha.fechaInicio.$lte = new Date(req.query.fechaHasta);
    }

    const resultado = await Reserva.aggregate([
      { $match: matchFecha },
      {
        $group: {
          _id: '$idUsuario',
          totalReservas: { $sum: 1 },
          horasAcumuladas: {
            $sum: {
              $divide: [{ $subtract: ['$fechaFin', '$fechaInicio'] }, 3600000]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' },
      {
        $lookup: {
          from: 'facultades',
          localField: 'usuario.idFacultad',
          foreignField: '_id',
          as: 'facultad'
        }
      },
      { $unwind: { path: '$facultad', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          codigoUsuario: '$usuario.codigoUsuario',
          nombreCompleto: '$usuario.nombreCompleto',
          rol: '$usuario.rol',
          facultad: '$facultad.nombre',
          totalReservas: 1,
          horasAcumuladas: { $round: ['$horasAcumuladas', 2] }
        }
      },
      { $sort: { horasAcumuladas: -1 } },
      { $limit: 10 }
    ]);

    res.json({ data: resultado, total: resultado.length });
  } catch (error) {
    next(error);
  }
};

// AGREGACION 3: Demanda por franja horaria y día de semana
exports.demandaHoraria = async (req, res, next) => {
  try {
    const resultado = await Reserva.aggregate([
      {
        $addFields: {
          // getHour en UTC; las fechas se almacenan en UTC, Colombia es UTC-5
          horaLocal: {
            $hour: {
              date: '$fechaInicio',
              timezone: 'America/Bogota'
            }
          },
          diaSemana: {
            $dayOfWeek: {
              date: '$fechaInicio',
              timezone: 'America/Bogota'
            }
          }
        }
      },
      {
        $addFields: {
          franja: {
            $switch: {
              branches: [
                {
                  case: { $and: [{ $gte: ['$horaLocal', 7] }, { $lt: ['$horaLocal', 12] }] },
                  then: 'Mañana (07-11)'
                },
                {
                  case: { $and: [{ $gte: ['$horaLocal', 12] }, { $lt: ['$horaLocal', 18] }] },
                  then: 'Tarde (12-17)'
                },
                {
                  case: { $and: [{ $gte: ['$horaLocal', 18] }, { $lte: ['$horaLocal', 21] }] },
                  then: 'Noche (18-21)'
                }
              ],
              default: 'Fuera de horario'
            }
          },
          nombreDia: {
            $switch: {
              branches: [
                { case: { $eq: ['$diaSemana', 1] }, then: 'Domingo' },
                { case: { $eq: ['$diaSemana', 2] }, then: 'Lunes' },
                { case: { $eq: ['$diaSemana', 3] }, then: 'Martes' },
                { case: { $eq: ['$diaSemana', 4] }, then: 'Miércoles' },
                { case: { $eq: ['$diaSemana', 5] }, then: 'Jueves' },
                { case: { $eq: ['$diaSemana', 6] }, then: 'Viernes' },
                { case: { $eq: ['$diaSemana', 7] }, then: 'Sábado' }
              ],
              default: 'Desconocido'
            }
          }
        }
      },
      {
        $group: {
          _id: { franja: '$franja', dia: '$nombreDia', numDia: '$diaSemana' },
          totalSolicitudes: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          franja: '$_id.franja',
          dia: '$_id.dia',
          numDia: '$_id.numDia',
          totalSolicitudes: 1
        }
      },
      { $sort: { numDia: 1, franja: 1 } }
    ]);

    res.json({ data: resultado, total: resultado.length });
  } catch (error) {
    next(error);
  }
};

// AGREGACION 4: Auditoría — cantidad de modificaciones por usuario, tipo de evento y colección
exports.auditoria = async (req, res, next) => {
  try {
    const resultado = await RegistroModificacion.aggregate([
      {
        $lookup: {
          from: 'usuarios',
          localField: 'idUsuario',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      { $unwind: '$usuario' },
      {
        $lookup: {
          from: 'facultades',
          localField: 'usuario.idFacultad',
          foreignField: '_id',
          as: 'facultad'
        }
      },
      { $unwind: { path: '$facultad', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            idUsuario: '$usuario._id',
            rol: '$usuario.rol',
            facultad: '$facultad.nombre',
            coleccion: '$coleccion',
            tipo: '$tipo'
          },
          nombreCompleto: { $first: '$usuario.nombreCompleto' },
          totalEventos: { $sum: 1 },
          primeraFecha: { $min: '$fecha' },
          ultimaFecha: { $max: '$fecha' }
        }
      },
      {
        $project: {
          _id: 0,
          idUsuario: '$_id.idUsuario',
          nombreCompleto: 1,
          rol: '$_id.rol',
          facultad: '$_id.facultad',
          coleccion: '$_id.coleccion',
          tipoEvento: '$_id.tipo',
          totalEventos: 1,
          primeraFecha: 1,
          ultimaFecha: 1
        }
      },
      { $sort: { totalEventos: -1 } }
    ]);

    res.json({ data: resultado, total: resultado.length });
  } catch (error) {
    next(error);
  }
};

// AGREGACION 5: Eficiencia operativa — antelación, duración y tiempo de reacción por estado
exports.eficiencia = async (req, res, next) => {
  try {
    const resultado = await Reserva.aggregate([
      {
        $addFields: {
          horasAntelacion: {
            $divide: [{ $subtract: ['$fechaInicio', '$fechaCreacion'] }, 3600000]
          },
          duracionHoras: {
            $divide: [{ $subtract: ['$fechaFin', '$fechaInicio'] }, 3600000]
          },
          tiempoReaccionAjuste: {
            $cond: [
              {
                $and: [
                  { $eq: ['$estado', 'Ajustada'] },
                  { $ifNull: ['$ultimaModificacion.fecha', false] }
                ]
              },
              {
                $divide: [
                  { $subtract: ['$ultimaModificacion.fecha', '$fechaCreacion'] },
                  3600000
                ]
              },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: '$estado',
          totalReservas: { $sum: 1 },
          promedioAntelacion: { $avg: '$horasAntelacion' },
          promedioDuracion: { $avg: '$duracionHoras' },
          promedioReaccion: { $avg: '$tiempoReaccionAjuste' }
        }
      },
      {
        $project: {
          _id: 0,
          estado: '$_id',
          totalReservas: 1,
          promedioAntelacionHoras: { $round: ['$promedioAntelacion', 2] },
          promedioDuracionHoras: { $round: ['$promedioDuracion', 2] },
          promedioReaccionAjusteHoras: {
            $cond: [
              { $ne: ['$promedioReaccion', null] },
              { $round: ['$promedioReaccion', 2] },
              null
            ]
          }
        }
      },
      { $sort: { totalReservas: -1 } }
    ]);

    res.json({ data: resultado, total: resultado.length });
  } catch (error) {
    next(error);
  }
};
