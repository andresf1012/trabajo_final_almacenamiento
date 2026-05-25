const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

const facultadesRoutes = require('./routes/facultades');
const usuariosRoutes = require('./routes/usuarios');
const salasRoutes = require('./routes/salas');
const reservasRoutes = require('./routes/reservas');
const registrosRoutes = require('./routes/registros');
const reportesRoutes = require('./routes/reportes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/facultades', facultadesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/registros', registrosRoutes);
app.use('/api/reportes', reportesRoutes);

app.use(errorHandler);

module.exports = app;
