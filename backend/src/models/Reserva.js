const mongoose = require('mongoose');

const ultimaModificacionSchema = new mongoose.Schema({
  idUsuarioResponsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, required: true }
}, { _id: false });

const reservaSchema = new mongoose.Schema({
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  estado: { type: String, enum: ['Activa', 'Cancelada', 'Ajustada'], default: 'Activa' },
  tipoEvento: { type: String, enum: ['Academica', 'Administrativa'], required: true },
  descripcion: { type: String },
  fechaCreacion: { type: Date, default: Date.now },
  idSala: { type: mongoose.Schema.Types.ObjectId, ref: 'Sala', required: true },
  idUsuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  ultimaModificacion: { type: ultimaModificacionSchema, default: null }
}, { collection: 'reservas', versionKey: false });

// Índice compuesto para detección eficiente de solapamientos por sala
reservaSchema.index({ idSala: 1, fechaInicio: 1, fechaFin: 1 });
// Índice para consultas de reservas por usuario
reservaSchema.index({ idUsuario: 1 });
// Índice para filtrar por estado (Activa/Cancelada/Ajustada)
reservaSchema.index({ estado: 1 });
// Índice para reportes por rango de fechas
reservaSchema.index({ fechaInicio: -1 });

module.exports = mongoose.model('Reserva', reservaSchema);
