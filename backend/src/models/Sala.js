const mongoose = require('mongoose');

const recursoSchema = new mongoose.Schema({
  numRecurso: { type: String, required: true },
  tipo: { type: String, enum: ['Proyector', 'Mesa', 'Televisor', 'Otro'], required: true },
  nombre: { type: String, required: true }
}, { _id: false });

const salaSchema = new mongoose.Schema({
  codigoSala: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  estado: { type: String, enum: ['Habilitada', 'Deshabilitada'], default: 'Habilitada' },
  observaciones: { type: String },
  idFacultad: { type: mongoose.Schema.Types.ObjectId, ref: 'Facultad', required: true },
  recursos: [recursoSchema]
}, { collection: 'salas', versionKey: false });

// Índice compuesto para listar salas por facultad y filtrar por estado
// (codigoSala ya tiene índice único declarado en el schema)
salaSchema.index({ idFacultad: 1, estado: 1 });

module.exports = mongoose.model('Sala', salaSchema);
