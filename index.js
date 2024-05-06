require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./models');
const {auditTables} = require('./middlewares/audit.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(cors());

// Define las rutas del API
app.use('/saag', require('./routes/solicitud.routes'));
app.use('/saag', require('./routes/ausencia.routes'));
app.use('/saag', require('./routes/usuario.routes'));
app.use('/saag', require('./routes/colaborador.routes'));
app.use('/saag', require('./routes/horasExtra.routes'));
app.use('/saag', require('./routes/puesto.routes'));
app.use('/saag', require('./routes/auditoria.routes'));
app.use('/saag', require('./routes/auditoriaLogin.routes'));
app.use('/saag', require('./routes/expediente.routes'));
app.use('/saag', require('./routes/documento.routes'));
app.use('/saag', require('./routes/telefono.routes'));
app.use(auditTables);
// Sincroniza la base de datos
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
  });
});

module.exports = app;

//opciones de ejecucion
// - node index.js
// npx nodemon -> este actualiza los cambios sin tener que parar y levantar el server otra vez

