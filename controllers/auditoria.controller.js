const db = require("../models");
const Auditoria = db.auditoria;


exports.createAuditTable = async (req, res, datos, direccionIp, agenteUsuario) => {
 
  if (req.body.length === 0) {
    res.status(400).send({
      message: "No puede venir sin datos",
    });
    return;
  }

    const idUsuario = req.user.id;
    const nombreUsuario =  req.user.nombreUsuario;
    const rol =  req.user.rol;
    const metodo = req.method;
    const nombre = req.originalUrl.substring(6);
    let datosAntiguos = null;
    let datosNuevos = null;
    let accion = null;
 
    if(metodo === 'POST'){
      accion = "Creación";
      const id = req.id;
  
      const keys = Object.keys(req.body);
      // Verificar si hay al menos una clave en el objeto
      if (keys.length > 0) {
        // Reemplazar el valor del primer elemento con el ID
        req.body[keys[0]] = id;
      }

     datosNuevos = Object.entries(req.body).map(([clave, valor]) => `${clave}: ${valor}`).join(', ');

    }

    if(metodo === 'PUT'){
      accion = "Actualización";
      let datosFiltrados = {};  
      Object.keys(req.body).forEach(key => {
        if(datos.hasOwnProperty(key) && req.body[key] !== datos[key]){
            datosFiltrados[key] = datos[key];
        }
    })

    let datosFiltrados2 = {};  
      Object.keys(datosFiltrados).forEach(key => {
        if(req.body.hasOwnProperty(key) && datosFiltrados[key] !== req.body[key]){
            datosFiltrados2[key] = req.body[key];
        }
    })

    datosAntiguos = Object.entries(datosFiltrados).map(([clave, valor]) => `${clave}: ${valor}`).join(', ');
    datosNuevos = Object.entries(datosFiltrados2).map(([clave, valor]) => `${clave}: ${valor}`).join(', ');


    }
    if(metodo === 'DELETE'){
      accion = "Eliminación";
      datosAntiguos = Object.entries(datos).map(([clave, valor]) => `${clave}: ${valor}`).join(', ');
    }

    Auditoria.create({
        idUsuario,
        nombreUsuario,
        rol,
        accion,
        nombre,
        datosAntiguos,
        datosNuevos,
        direccionIp,
        agenteUsuario
    })
    .then((data) => {

    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Ocurrió un error al crear la auditoria.",
      });
    });
};

exports.findAllAuditTables = async (req, res) => {
    try {
      const data = await Auditoria.findAll();
      res.send(data);
    } catch (err) {
      if (err.name === 'SequelizeDatabaseError') {
        res.status(500).send({
          message: "Error en la base de datos. Verifica la configuración.",
        });
      } else {
        res.status(500).send({
          message: "Ocurrió un error al obtener los usuarios.",
        });
      }
    }
  };



// Obtiene una auditoria por ID
exports.findOne = (req, res) => {
  const id = req.params.id;

  Auditoria.findByPk(id)
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `No se encontró una auditoria con ID ${id}`,
        });
      } else {
       return data;
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: `Ocurrió un error al obtener la auditoria con ID ${id}`,
      });
    });
};


exports.delete = (req, res, next) => {
  const id = req.params.id;

  // Busca el auditoria en la base de datos
  Auditoria.findByPk(id)
    .then((auditoria) => {
      if (!auditoria) {
        res.status(404).send({
          message: `No se encontró una auditoria con ID ${id}`,
        });
      } else {
        auditoria
          .destroy()
          .then(() => {
            res.send({
              message: "La auditoria fue eliminada exitosamente",
            });
          })
          .catch((err) => {
            res.status(500).send({
              message:
                err.message ||
                `Ocurrió un error al eliminar la auditoria con ID ${id}`,
            });
          });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: `Ocurrió un error al obtener la auditoria con ID ${id}`,
      });
    });
};
