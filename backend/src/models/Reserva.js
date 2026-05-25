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

module.exports = mongoose.model('Reserva', reservaSchema);
