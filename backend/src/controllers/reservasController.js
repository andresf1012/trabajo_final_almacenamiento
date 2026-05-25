const Reserva = require('../models/Reserva');
const Sala = require('../models/Sala');
const Usuario = require('../models/Usuario');
const RegistroModificacion = require('../models/RegistroModificacion');

// Horario institucional: 7:00 a.m. a 9:30 p.m. (hora Colombia UTC-5)
const HORA_APERTURA = 7 * 60;     // 420 minutos
const HORA_CIERRE = 21 * 60 + 30; // 1290 minutos

function toHoraLocal(date) {
  // Colombia es UTC-5: restamos 5h para convertir UTC → hora local
  return new Date(new Date(date).getTime() - 5 * 3600000);
}

function validarHorarioInstitucional(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (fin <= inicio) return false;

  const inicioLocal = toHoraLocal(inicio);
  const finLocal = toHoraLocal(fin);

  const minInicio = inicioLocal.getUTCHours() * 60 + inicioLocal.getUTCMinutes();
  const minFin = finLocal.getUTCHours() * 60 + finLocal.getUTCMinutes();

  return minInicio >= HORA_APERTURA && minFin <= HORA_CIERRE;
}

async function haySolapamiento(idSala, fechaInicio, fechaFin, excludeId = null) {
  const query = {
    idSala,
    estado: { $in: ['Activa', 'Ajustada'] },
    fechaInicio: { $lt: new Date(fechaFin) },
    fechaFin: { $gt: new Date(fechaInicio) }
  };
  if (excludeId) query._id = { $ne: excludeId };
  return (await Reserva.countDocuments(query)) > 0;
}

exports.listar = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.idSala) filtro.idSala = req.query.idSala;
    if (req.query.idUsuario) filtro.idUsuario = req.query.idUsuario;
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.fechaDesde || req.query.fechaHasta) {
      filtro.fechaInicio = {};
      if (req.query.fechaDesde) filtro.fechaInicio.$gte = new Date(req.query.fechaDesde);
      if (req.query.fechaHasta) filtro.fechaInicio.$lte = new Date(req.query.fechaHasta);
    }

    const reservas = await Reserva.find(filtro)
      .populate('idSala', 'codigoSala nombre')
      .populate('idUsuario', 'codigoUsuario nombreCompleto rol')
      .sort({ fechaInicio: -1 });

    res.json({ data: reservas, total: reservas.length });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const reserva = await Reserva.findById(req.params.id)
      .populate('idSala', 'codigoSala nombre idFacultad')
      .populate('idUsuario', 'codigoUsuario nombreCompleto rol idFacultad');
    if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    res.json({ data: reserva });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const { idSala, idUsuario, fechaInicio, fechaFin, tipoEvento, descripcion } = req.body;

    const usuario = await Usuario.findById(idUsuario);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (usuario.estado === 'Inactivo') {
      return res.status(400).json({ mensaje: 'El usuario está inactivo y no puede realizar reservas' });
    }

    const sala = await Sala.findById(idSala);
    if (!sala) return res.status(404).json({ mensaje: 'Sala no encontrada' });
    if (sala.estado === 'Deshabilitada') {
      return res.status(400).json({ mensaje: 'La sala está deshabilitada' });
    }

    if (!validarHorarioInstitucional(fechaInicio, fechaFin)) {
      return res.status(400).json({
        mensaje: 'La reserva debe estar dentro del horario institucional (7:00 a.m. - 9:30 p.m.) y la hora de fin debe ser mayor a la de inicio'
      });
    }

    // Docentes y secretarias solo pueden reservar salas de su propia facultad
    if (sala.idFacultad.toString() !== usuario.idFacultad.toString()) {
      return res.status(403).json({
        mensaje: `Los usuarios solo pueden reservar salas de su propia facultad`
      });
    }

    if (await haySolapamiento(idSala, fechaInicio, fechaFin)) {
      return res.status(409).json({
        mensaje: 'Ya existe una reserva activa que se solapa con el horario solicitado para esta sala'
      });
    }

    const reserva = await Reserva.create({
      idSala,
      idUsuario,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      estado: 'Activa',
      tipoEvento,
      descripcion,
      fechaCreacion: new Date()
    });

    res.status(201).json({ mensaje: 'Reserva creada exitosamente', data: reserva });
  } catch (error) {
    next(error);
  }
};

// PUT /api/reservas/:id — solo secretarias pueden ajustar reservas de su facultad
exports.ajustar = async (req, res, next) => {
  try {
    const { idUsuarioAccion, fechaInicio, fechaFin, tipoEvento, descripcion } = req.body;

    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    if (reserva.estado === 'Cancelada') {
      return res.status(400).json({ mensaje: 'No se puede ajustar una reserva cancelada' });
    }

    const usuarioAccion = await Usuario.findById(idUsuarioAccion);
    if (!usuarioAccion) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (usuarioAccion.rol !== 'Secretaria') {
      return res.status(403).json({ mensaje: 'Solo las secretarias pueden ajustar reservas' });
    }

    const sala = await Sala.findById(reserva.idSala);
    if (sala.idFacultad.toString() !== usuarioAccion.idFacultad.toString()) {
      return res.status(403).json({ mensaje: 'Solo puede ajustar reservas de salas de su propia facultad' });
    }

    const nuevaFechaInicio = fechaInicio ? new Date(fechaInicio) : reserva.fechaInicio;
    const nuevaFechaFin = fechaFin ? new Date(fechaFin) : reserva.fechaFin;

    if (!validarHorarioInstitucional(nuevaFechaInicio, nuevaFechaFin)) {
      return res.status(400).json({
        mensaje: 'El nuevo horario debe estar dentro del horario institucional (7:00 a.m. - 9:30 p.m.)'
      });
    }

    if (await haySolapamiento(reserva.idSala, nuevaFechaInicio, nuevaFechaFin, reserva._id)) {
      return res.status(409).json({ mensaje: 'El nuevo horario se solapa con otra reserva activa' });
    }

    // Determinar el campo principal modificado para el log de auditoría
    let campoLog = 'estado';
    let anteriorLog = reserva.estado;
    let nuevoLog = 'Ajustada';

    if (fechaInicio && nuevaFechaInicio.toISOString() !== reserva.fechaInicio.toISOString()) {
      campoLog = 'fechaInicio';
      anteriorLog = reserva.fechaInicio.toISOString();
      nuevoLog = nuevaFechaInicio.toISOString();
    } else if (fechaFin && nuevaFechaFin.toISOString() !== reserva.fechaFin.toISOString()) {
      campoLog = 'fechaFin';
      anteriorLog = reserva.fechaFin.toISOString();
      nuevoLog = nuevaFechaFin.toISOString();
    } else if (tipoEvento && tipoEvento !== reserva.tipoEvento) {
      campoLog = 'tipoEvento';
      anteriorLog = reserva.tipoEvento;
      nuevoLog = tipoEvento;
    }

    if (fechaInicio) reserva.fechaInicio = nuevaFechaInicio;
    if (fechaFin) reserva.fechaFin = nuevaFechaFin;
    if (tipoEvento) reserva.tipoEvento = tipoEvento;
    if (descripcion !== undefined) reserva.descripcion = descripcion;
    reserva.estado = 'Ajustada';
    reserva.ultimaModificacion = { idUsuarioResponsable: idUsuarioAccion, fecha: new Date() };
    await reserva.save();

    await RegistroModificacion.create({
      idDocumentoModificado: reserva._id,
      coleccion: 'reservas',
      tipo: 'modificacion',
      fecha: new Date(),
      descripcion: `Reserva ajustada por ${usuarioAccion.nombreCompleto}`,
      idUsuario: idUsuarioAccion,
      datosModificacion: {
        campoModificado: campoLog,
        valorAnterior: anteriorLog,
        valorNuevo: nuevoLog
      }
    });

    res.json({ mensaje: 'Reserva ajustada exitosamente', data: reserva });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reservas/:id — docentes cancelan las propias; secretarias cancelan cualquiera de su facultad
exports.cancelar = async (req, res, next) => {
  try {
    const { idUsuarioAccion } = req.body;

    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    if (reserva.estado === 'Cancelada') {
      return res.status(400).json({ mensaje: 'La reserva ya se encuentra cancelada' });
    }

    const usuarioAccion = await Usuario.findById(idUsuarioAccion);
    if (!usuarioAccion) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const sala = await Sala.findById(reserva.idSala);

    if (usuarioAccion.rol === 'Docente') {
      if (reserva.idUsuario.toString() !== idUsuarioAccion.toString()) {
        return res.status(403).json({ mensaje: 'Los docentes solo pueden cancelar sus propias reservas' });
      }
    } else if (usuarioAccion.rol === 'Secretaria') {
      if (sala.idFacultad.toString() !== usuarioAccion.idFacultad.toString()) {
        return res.status(403).json({
          mensaje: 'Las secretarias solo pueden cancelar reservas de salas de su propia facultad'
        });
      }
    }

    const estadoAnterior = reserva.estado;
    reserva.estado = 'Cancelada';
    reserva.ultimaModificacion = { idUsuarioResponsable: idUsuarioAccion, fecha: new Date() };
    await reserva.save();

    await RegistroModificacion.create({
      idDocumentoModificado: reserva._id,
      coleccion: 'reservas',
      tipo: 'cancelacion',
      fecha: new Date(),
      descripcion: `Reserva cancelada por ${usuarioAccion.nombreCompleto} (${usuarioAccion.rol})`,
      idUsuario: idUsuarioAccion,
      datosModificacion: {
        campoModificado: 'estado',
        valorAnterior: estadoAnterior,
        valorNuevo: 'Cancelada'
      }
    });

    res.json({ mensaje: 'Reserva cancelada exitosamente', data: reserva });
  } catch (error) {
    next(error);
  }
};
