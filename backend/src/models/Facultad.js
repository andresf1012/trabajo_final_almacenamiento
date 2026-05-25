const mongoose = require('mongoose');

const facultadSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String }
}, { collection: 'facultades', versionKey: false });

module.exports = mongoose.model('Facultad', facultadSchema);
