const Usuario = require('../models/Usuario');

exports.listar = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.idFacultad) filtro.idFacultad = req.query.idFacultad;
    if (req.query.rol) filtro.rol = req.query.rol;
    if (req.query.estado) filtro.estado = req.query.estado;

    const usuarios = await Usuario.find(filtro).populate('idFacultad', 'nombre');
    res.json({ data: usuarios, total: usuarios.length });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.params.id).populate('idFacultad', 'nombre');
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ data: usuario });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const usuario = await Usuario.create(req.body);
    res.status(201).json({ mensaje: 'Usuario creado exitosamente', data: usuario });
  } catch (error) {
    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario actualizado exitosamente', data: usuario });
  } catch (error) {
    next(error);
  }
};

// Inactivación lógica: no se elimina el documento, se cambia el estado
exports.inactivar = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { estado: 'Inactivo' },
      { new: true }
    );
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario inactivado exitosamente', data: usuario });
  } catch (error) {
    next(error);
  }
};
