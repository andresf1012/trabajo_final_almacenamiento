module.exports = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const errores = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ mensaje: 'Error de validación', errores });
  }

  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(400).json({ mensaje: `El valor del campo '${campo}' ya existe` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ mensaje: 'ID con formato inválido' });
  }

  res.status(500).json({ mensaje: 'Error interno del servidor', error: err.message });
};
