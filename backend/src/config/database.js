const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conexión a MongoDB establecida');
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
