const Facultad = require('../models/Facultad');

exports.listar = async (req, res, next) => {
  try {
    const facultades = await Facultad.find();
    res.json({ data: facultades, total: facultades.length });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const facultad = await Facultad.findById(req.params.id);
    if (!facultad) return res.status(404).json({ mensaje: 'Facultad no encontrada' });
    res.json({ data: facultad });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const facultad = await Facultad.create(req.body);
    res.status(201).json({ mensaje: 'Facultad creada exitosamente', data: facultad });
  } catch (error) {
    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const facultad = await Facultad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!facultad) return res.status(404).json({ mensaje: 'Facultad no encontrada' });
    res.json({ mensaje: 'Facultad actualizada exitosamente', data: facultad });
  } catch (error) {
    next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const facultad = await Facultad.findByIdAndDelete(req.params.id);
    if (!facultad) return res.status(404).json({ mensaje: 'Facultad no encontrada' });
    res.json({ mensaje: 'Facultad eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};
