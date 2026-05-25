const RegistroModificacion = require('../models/RegistroModificacion');

exports.listar = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.coleccion) filtro.coleccion = req.query.coleccion;
    if (req.query.tipo) filtro.tipo = req.query.tipo;
    if (req.query.idUsuario) filtro.idUsuario = req.query.idUsuario;

    const registros = await RegistroModificacion.find(filtro)
      .populate('idUsuario', 'codigoUsuario nombreCompleto rol')
      .sort({ fecha: -1 });

    res.json({ data: registros, total: registros.length });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const registro = await RegistroModificacion.findById(req.params.id)
      .populate('idUsuario', 'codigoUsuario nombreCompleto rol');
    if (!registro) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    res.json({ data: registro });
  } catch (error) {
    next(error);
  }
};

exports.porDocumento = async (req, res, next) => {
  try {
    const registros = await RegistroModificacion.find({
      idDocumentoModificado: req.params.idDocumento
    })
      .populate('idUsuario', 'codigoUsuario nombreCompleto rol')
      .sort({ fecha: -1 });

    res.json({ data: registros, total: registros.length });
  } catch (error) {
    next(error);
  }
};
