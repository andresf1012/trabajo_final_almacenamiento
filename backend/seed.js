require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');

const Facultad = require('./src/models/Facultad');
const Usuario = require('./src/models/Usuario');
const Sala = require('./src/models/Sala');
const Reserva = require('./src/models/Reserva');
const RegistroModificacion = require('./src/models/RegistroModificacion');

// Crea un Date UTC correspondiente a una hora local Colombia (UTC-5)
function fechaCol(diasOffset, horaLocal, minutos = 0) {
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + diasOffset);
  // Colombia UTC-5: horaLocal + 5 = horaUTC
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), horaLocal + 5, minutos));
}

async function seed() {
  await connectDB();

  await Promise.all([
    Facultad.deleteMany({}),
    Usuario.deleteMany({}),
    Sala.deleteMany({}),
    Reserva.deleteMany({}),
    RegistroModificacion.deleteMany({})
  ]);

  // ── Facultades ──────────────────────────────────────────────────────────────
  const [facIng, facEco, facCom] = await Facultad.insertMany([
    {
      nombre: 'Facultad de Ingeniería y Ciencias Básicas',
      descripcion: 'Ingeniería de sistemas, civil, electrónica y afines'
    },
    {
      nombre: 'Facultad de Ciencias Económicas y Empresariales',
      descripcion: 'Administración, contaduría pública y economía'
    },
    {
      nombre: 'Facultad de Comunicación Social',
      descripcion: 'Comunicación social, periodismo y publicidad'
    }
  ]);

  // ── Usuarios ─────────────────────────────────────────────────────────────────
  const [docIng, secIng, docEco, secEco, docCom, secCom] = await Usuario.insertMany([
    {
      codigoUsuario: 'USR-001',
      nombreCompleto: 'Carlos Ramírez Ospina',
      email: 'caramirez@uao.edu.co',
      rol: 'Docente',
      estado: 'Activo',
      idFacultad: facIng._id
    },
    {
      codigoUsuario: 'USR-002',
      nombreCompleto: 'Ana María Gómez',
      email: 'amgomez@uao.edu.co',
      rol: 'Secretaria',
      estado: 'Activo',
      idFacultad: facIng._id
    },
    {
      codigoUsuario: 'USR-003',
      nombreCompleto: 'Luis Fernando Martínez',
      email: 'lfmartinez@uao.edu.co',
      rol: 'Docente',
      estado: 'Activo',
      idFacultad: facEco._id
    },
    {
      codigoUsuario: 'USR-004',
      nombreCompleto: 'María Torres Valencia',
      email: 'matorres@uao.edu.co',
      rol: 'Secretaria',
      estado: 'Activo',
      idFacultad: facEco._id
    },
    {
      codigoUsuario: 'USR-005',
      nombreCompleto: 'Juan Esteban Pérez',
      email: 'jeperez@uao.edu.co',
      rol: 'Docente',
      estado: 'Activo',
      idFacultad: facCom._id
    },
    {
      codigoUsuario: 'USR-006',
      nombreCompleto: 'Laura Díaz Morales',
      email: 'ladiaz@uao.edu.co',
      rol: 'Secretaria',
      estado: 'Activo',
      idFacultad: facCom._id
    }
  ]);

  // ── Salas ─────────────────────────────────────────────────────────────────────
  const [salaIng1, salaIng2, salaEco1, salaEco2, salaCom1, salaCom2] = await Sala.insertMany([
    {
      codigoSala: 'S-ING-01',
      nombre: 'Sala A-101 Ingeniería',
      estado: 'Habilitada',
      idFacultad: facIng._id,
      observaciones: 'Sala principal de reuniones de la facultad',
      recursos: [
        { numRecurso: 'R001', tipo: 'Proyector', nombre: 'Proyector Epson X41' },
        { numRecurso: 'R002', tipo: 'Mesa', nombre: 'Mesa de reuniones 10 puestos' }
      ]
    },
    {
      codigoSala: 'S-ING-02',
      nombre: 'Sala A-102 Ingeniería',
      estado: 'Habilitada',
      idFacultad: facIng._id,
      recursos: [
        { numRecurso: 'R003', tipo: 'Televisor', nombre: 'TV Samsung 55"' }
      ]
    },
    {
      codigoSala: 'S-ECO-01',
      nombre: 'Sala B-201 Económicas',
      estado: 'Habilitada',
      idFacultad: facEco._id,
      recursos: [
        { numRecurso: 'R004', tipo: 'Proyector', nombre: 'Proyector BenQ MX535' },
        { numRecurso: 'R005', tipo: 'Mesa', nombre: 'Mesa de reuniones 8 puestos' }
      ]
    },
    {
      codigoSala: 'S-ECO-02',
      nombre: 'Sala B-202 Económicas',
      estado: 'Deshabilitada',
      idFacultad: facEco._id,
      observaciones: 'En mantenimiento — reparación de aire acondicionado'
    },
    {
      codigoSala: 'S-COM-01',
      nombre: 'Sala C-301 Comunicación',
      estado: 'Habilitada',
      idFacultad: facCom._id,
      recursos: [
        { numRecurso: 'R006', tipo: 'Proyector', nombre: 'Proyector LG BF50NST' }
      ]
    },
    {
      codigoSala: 'S-COM-02',
      nombre: 'Sala C-302 Comunicación',
      estado: 'Habilitada',
      idFacultad: facCom._id,
      recursos: []
    }
  ]);

  // ── Reservas ──────────────────────────────────────────────────────────────────
  const reservas = await Reserva.insertMany([
    // Hoy — reserva activa Ingeniería
    {
      idSala: salaIng1._id,
      idUsuario: docIng._id,
      fechaInicio: fechaCol(0, 9),
      fechaFin: fechaCol(0, 11),
      estado: 'Activa',
      tipoEvento: 'Academica',
      descripcion: 'Reunión de comité curricular',
      fechaCreacion: fechaCol(-1, 8)
    },
    // Hoy — reserva activa Económicas
    {
      idSala: salaEco1._id,
      idUsuario: docEco._id,
      fechaInicio: fechaCol(0, 14),
      fechaFin: fechaCol(0, 16),
      estado: 'Activa',
      tipoEvento: 'Administrativa',
      descripcion: 'Reunión de planeación semestral',
      fechaCreacion: fechaCol(-2, 10)
    },
    // Mañana — reserva ajustada Comunicación
    {
      idSala: salaCom1._id,
      idUsuario: docCom._id,
      fechaInicio: fechaCol(1, 10),
      fechaFin: fechaCol(1, 12),
      estado: 'Ajustada',
      tipoEvento: 'Academica',
      descripcion: 'Reunión de acreditación institucional',
      fechaCreacion: fechaCol(-3, 9),
      ultimaModificacion: {
        idUsuarioResponsable: secCom._id,
        fecha: fechaCol(-1, 11)
      }
    },
    // Pasada — cancelada por docente Ingeniería
    {
      idSala: salaIng2._id,
      idUsuario: docIng._id,
      fechaInicio: fechaCol(-3, 15),
      fechaFin: fechaCol(-3, 17),
      estado: 'Cancelada',
      tipoEvento: 'Administrativa',
      descripcion: 'Reunión de seguimiento — cancelada',
      fechaCreacion: fechaCol(-5, 8),
      ultimaModificacion: {
        idUsuarioResponsable: docIng._id,
        fecha: fechaCol(-4, 9)
      }
    },
    // Pasada — activa Ingeniería (para enriquecer agregaciones)
    {
      idSala: salaIng1._id,
      idUsuario: docIng._id,
      fechaInicio: fechaCol(-7, 8),
      fechaFin: fechaCol(-7, 10),
      estado: 'Activa',
      tipoEvento: 'Academica',
      fechaCreacion: fechaCol(-9, 8)
    },
    // Pasada — activa Económicas secretaria
    {
      idSala: salaEco1._id,
      idUsuario: secEco._id,
      fechaInicio: fechaCol(-4, 13),
      fechaFin: fechaCol(-4, 15),
      estado: 'Activa',
      tipoEvento: 'Administrativa',
      fechaCreacion: fechaCol(-5, 9)
    },
    // Futura — activa Comunicación
    {
      idSala: salaCom2._id,
      idUsuario: docCom._id,
      fechaInicio: fechaCol(3, 7, 30),
      fechaFin: fechaCol(3, 9),
      estado: 'Activa',
      tipoEvento: 'Academica',
      descripcion: 'Revisión de pensum',
      fechaCreacion: fechaCol(-1, 14)
    }
  ]);

  // ── Registros de modificaciones ───────────────────────────────────────────────
  await RegistroModificacion.insertMany([
    {
      idDocumentoModificado: reservas[2]._id,
      coleccion: 'reservas',
      tipo: 'modificacion',
      fecha: fechaCol(-1, 11),
      descripcion: 'Hora de inicio modificada por secretaria — ajuste por solicitud del docente',
      idUsuario: secCom._id,
      datosModificacion: {
        campoModificado: 'fechaInicio',
        valorAnterior: fechaCol(1, 9).toISOString(),
        valorNuevo: fechaCol(1, 10).toISOString()
      }
    },
    {
      idDocumentoModificado: reservas[3]._id,
      coleccion: 'reservas',
      tipo: 'cancelacion',
      fecha: fechaCol(-4, 9),
      descripcion: 'Reserva cancelada por el propio docente',
      idUsuario: docIng._id,
      datosModificacion: {
        campoModificado: 'estado',
        valorAnterior: 'Activa',
        valorNuevo: 'Cancelada'
      }
    },
    {
      idDocumentoModificado: salaEco2._id,
      coleccion: 'salas',
      tipo: 'cambioEstadoSala',
      fecha: fechaCol(-10, 14),
      descripcion: 'Sala deshabilitada por inicio de mantenimiento del aire acondicionado',
      idUsuario: secEco._id,
      datosModificacion: {
        campoModificado: 'estado',
        valorAnterior: 'Habilitada',
        valorNuevo: 'Deshabilitada'
      }
    }
  ]);

  console.log('✓ Facultades:', 3);
  console.log('✓ Usuarios:', 6);
  console.log('✓ Salas:', 6);
  console.log('✓ Reservas:', reservas.length);
  console.log('✓ Registros de auditoría:', 3);
  console.log('\nDatos de prueba cargados exitosamente en la base de datos.');

  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
