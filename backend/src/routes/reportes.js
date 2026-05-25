const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportesController');

router.get('/ocupacion-facultad', ctrl.ocupacionFacultad);
router.get('/top-usuarios', ctrl.topUsuarios);
router.get('/demanda-horaria', ctrl.demandaHoraria);
router.get('/auditoria', ctrl.auditoria);
router.get('/eficiencia', ctrl.eficiencia);

module.exports = router;
