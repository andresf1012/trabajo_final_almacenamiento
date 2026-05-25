const mongoose = require('mongoose');

const datosModificacionSchema = new mongoose.Schema({
  campoModificado: { type: String, required: true },
  valorAnterior: { type: String, required: true },
  valorNuevo: { type: String, required: true }
}, { _id: false });

const registroModificacionSchema = new mongoose.Schema({
  idDocumentoModificado: { type: mongoose.Schema.Types.ObjectId, required: true },
  coleccion: { type: String, enum: ['reservas', 'salas'], required: true },
  tipo: { type: String, enum: ['cancelacion', 'modificacion', 'cambioEstadoSala'], required: true },
  fecha: { type: Date, default: Date.now },
  descripcion: { type: String, required: true },
  idUsuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  datosModificacion: { type: datosModificacionSchema, required: true }
}, { collection: 'registrosModificaciones', versionKey: false });

// Índice para recuperar el historial completo de un documento específico
registroModificacionSchema.index({ idDocumentoModificado: 1 });
// Índice para auditoría por usuario
registroModificacionSchema.index({ idUsuario: 1 });
// Índice cronológico descendente para mostrar eventos más recientes primero
registroModificacionSchema.index({ fecha: -1 });

module.exports = mongoose.model('RegistroModificacion', registroModificacionSchema);
