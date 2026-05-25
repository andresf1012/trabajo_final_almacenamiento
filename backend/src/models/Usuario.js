const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  codigoUsuario: { type: String, required: true, unique: true },
  nombreCompleto: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  rol: { type: String, enum: ['Docente', 'Secretaria'], required: true },
  estado: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
  idFacultad: { type: mongoose.Schema.Types.ObjectId, ref: 'Facultad', required: true }
}, { collection: 'usuarios', versionKey: false });

// Índices únicos para evitar duplicados de correo y código institucional
usuarioSchema.index({ email: 1 }, { unique: true });
usuarioSchema.index({ codigoUsuario: 1 }, { unique: true });
// Índice para consultas por facultad y rol
usuarioSchema.index({ idFacultad: 1, rol: 1 });

module.exports = mongoose.model('Usuario', usuarioSchema);
