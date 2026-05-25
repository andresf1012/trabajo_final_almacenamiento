const Sala = require('../models/Sala');
const Reserva = require('../models/Reserva');
const RegistroModificacion = require('../models/RegistroModificacion');

exports.listar = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.idFacultad) filtro.idFacultad = req.query.idFacultad;
    if (req.query.estado) filtro.estado = req.query.estado;

    const salas = await Sala.find(filtro).populate('idFacultad', 'nombre');
    res.json({ data: salas, total: salas.length });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const sala = await Sala.findById(req.params.id).populate('idFacultad', 'nombre');
    if (!sala) return res.status(404).json({ mensaje: 'Sala no encontrada' });
    res.json({ data: sala });
  } catch (error) {
    next(error);
  }
};

// Retorna salas habilitadas que no tienen conflicto en el rango solicitado
exports.disponibles = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, idFacultad } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ mensaje: 'Se requieren los parámetros fechaInicio y fechaFin' });
    }

    const filtroSala = { estado: 'Habilitada' };
    if (idFacultad) filtroSala.idFacultad = idFacultad;

    const salasConConflicto = await Reserva.distinct('idSala', {
      estado: { $in: ['Activa', 'Ajustada'] },
      fechaInicio: { $lt: new Date(fechaFin) },
      fechaFin: { $gt: new Date(fechaInicio) }
    });

    filtroSala._id = { $nin: salasConConflicto };

    const salas = await Sala.find(filtroSala).populate('idFacultad', 'nombre');
    res.json({ data: salas, total: salas.length });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const sala = await Sala.create(req.body);
    res.status(201).json({ mensaje: 'Sala creada exitosamente', data: sala });
  } catch (error) {
    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const { idUsuarioAccion, ...actualizaciones } = req.body;

    const sala = await Sala.findById(req.params.id);
    if (!sala) return res.status(404).json({ mensaje: 'Sala no encontrada' });

    const estadoAnterior = sala.estado;
    Object.assign(sala, actualizaciones);
    await sala.save();

    // Si cambia el estado, registrar en el log de auditoría
    if (actualizaciones.estado && actualizaciones.estado !== estadoAnterior && idUsuarioAccion) {
      await RegistroModificacion.create({
        idDocumentoModificado: sala._id,
        coleccion: 'salas',
        tipo: 'cambioEstadoSala',
        fecha: new Date(),
        descripcion: `Estado de sala "${sala.nombre}" cambiado de "${estadoAnterior}" a "${actualizaciones.estado}"`,
        idUsuario: idUsuarioAccion,
        datosModificacion: {
          campoModificado: 'estado',
          valorAnterior: estadoAnterior,
          valorNuevo: actualizaciones.estado
        }
      });
    }

    res.json({ mensaje: 'Sala actualizada exitosamente', data: sala });
  } catch (error) {
    next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const sala = await Sala.findByIdAndDelete(req.params.id);
    if (!sala) return res.status(404).json({ mensaje: 'Sala no encontrada' });
    res.json({ mensaje: 'Sala eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};
