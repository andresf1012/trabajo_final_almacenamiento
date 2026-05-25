const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  codigoUsuario: { type: String, required: true, unique: true },
  nombreCompleto: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  rol: { type: String, enum: ['Docente', 'Secretaria'], required: true },
  estado: { type: String, enum: ['Activo', 'Inactivo'], default: 'Activo' },
  idFacultad: { type: mongoose.Schema.Types.ObjectId, ref: 'Facultad', required: true }
}, { collection: 'usuarios', versionKey: false });

// Índice compuesto para consultas por facultad y rol
// (email y codigoUsuario ya tienen índice único declarado en el schema)
usuarioSchema.index({ idFacultad: 1, rol: 1 });

module.exports = mongoose.model('Usuario', usuarioSchema);
