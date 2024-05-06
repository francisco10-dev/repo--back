const db = require("../models");
const Usuario = db.usuario;
const Colaborador = db.colaborador;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Puesto = db.puesto;

exports.create = async (req, res, next) => {    // crear correo automatico, preguntar a quien le debe llegar el correo
  console.log(req.body.nombreUsuario,req.body.idColaborador,req.body.contrasena);
  if (req.body.length === 0) {
    res.status(400).send({
      message: "No puede venir sin datos",
    });
    return;
  }
  if (!validarContrasena(req.body.contrasena)) {
    res.status(400).send({
      message: "La contraseña no cumple con las reglas requeridas.",
    });
    return;
  }
  // Encriptar la contraseña antes de guardarla en la base de datos
  const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);

  // Crear un nuevo usuario con la contraseña encriptada
  Usuario.create({
    nombreUsuario: req.body.nombreUsuario,
    contrasena: hashedPassword,
    rol: req.body.rol,
    idColaborador: req.body.idColaborador,
  })
    .then((data) => {
      res.status(200).send({
        message: `Agregado correctamente el usuario del colaborador con id ${req.body.idColaborador}`,
        data: data,
      });
      next();
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Ocurrió un error al crear el usuario.",
      });
    });
};

exports.findAll = async (req, res, next) => {
  try {
    const data = await Usuario.findAll();
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


// Obtiene un usuario por ID
exports.findOne = (req, res, next) => {
  const id = req.params.id;

  Usuario.findByPk(id)
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `No se encontró un usuario con ID ${id}`,
        });
      } else {
        res.send(data);
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: `Ocurrió un error al obtener el usuario con ID ${id}`,
      });
    });
};

// Actualiza un usuario por ID
exports.update = async (req, res, next) => {
  const id = req.params.id;

  if (!validarContrasena(req.body.contrasena)) {
    res.status(400).send({
      message: "La contraseña no cumple con las reglas requeridas.",
    });
    return;
  }

  try {
    // Busca el usuario en la base de datos
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      res.status(404).send({
        message: `No se encontró un usuario con ID ${id}`,
      });
      return;
    }
    req.datos = usuario;
    // Encriptar la nueva contraseña antes de actualizarla
    const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);

    // Actualiza el usuario con los nuevos datos del cuerpo del usuario, incluyendo la contraseña encriptada
    await usuario.update({
      nombreUsuario: req.body.nombreUsuario,
      contrasena: hashedPassword,
      rol: req.body.rol,
      idColaborador: req.body.idColaborador,
    });

    res.status(200).send({
      message: `Actualizado correctamente el usuario con ID ${id}`,
    });
    next();
  } catch (err) {
    res.status(500).send({
      message: `Ocurrió un error al actualizar el usuario con ID ${id}: ${err.message}`,
    });
  }
};

exports.delete = (req, res, next) => {
  const id = req.params.id;
  // Busca el usuario en la base de datos
  Usuario.findByPk(id)
    .then((usuario) => {
      if (!usuario) {
        res.status(404).send({
          message: `No se encontró un usuario con ID ${id}`,
        });
      } else {

        req.datos = {...usuario.get()};
        // Elimina el usuario de la base de datos
        usuario
          .destroy()
          .then(() => {
            res.send({ 
              message: "El usuario fue eliminado exitosamente",
            });
            next();
          })
          .catch((err) => {
            res.status(500).send({
              message:
                err.message ||
                `Ocurrió un error al eliminar el usuario con ID ${id}`,
            });
          });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: `Ocurrió un error al obtener el usuario con ID ${id}`,
      });
    });
};

exports.login = async (req, res,next) => {
  const { nombreUsuario, contrasena } = req.body;

  // Buscar el usuario por nombre de usuario
  Usuario.findOne({ where: { nombreUsuario }, 
    include: [
      {
        model: Colaborador,
        as: 'colaborador',
        include: [
          {
            model: Puesto,
            as: 'puesto'          
          }
        ]
      },
    ], })
    .then(async (usuario) => {
      if (!usuario) {
        req.exito = false;
        next();

        return res
          .status(401)
          .json({ message: "Nombre de usuario inexistente" });
      }
     

      // Verificar la contraseña utilizando bcrypt.compare
      const verificarContrasena = await bcrypt.compare(
        contrasena,
        usuario.contrasena
      );

      if (!verificarContrasena) {
        req.exito = false;
        next();
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      // Las credenciales son válidas, generar un token JWT
      const accessToken = jwt.sign(
        {
          nombreUsuario: usuario.nombreUsuario,
          id: usuario.idUsuario,
          rol: usuario.rol,
        },
        "secret_key",
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        {
          nombreUsuario: usuario.nombreUsuario,
          id: usuario.idUsuario,
          rol: usuario.rol,
        },
        "secretRefresh_key",
        { expiresIn: "1h" }
      );

      await usuario.update({
        refreshToken: refreshToken
      });

      const colaborador = usuario.colaborador;


      req.exito = true;
      req.token = refreshToken;
      next();

      res.json({colaborador, accessToken, refreshToken});
    })
    .catch((err) => {
      res.status(500).json({ message: "Error interno del servidor" });
    });
    
    
};

exports.logout = (req, res, next) => {
  const refreshToken = req.params.token;

  if (!refreshToken) return res.sendStatus(401).json({ message:  refreshToken});

  Usuario.findOne({ where: { refreshToken } })
  .then(async (usuario) => {
    if (!usuario) {
      return res
        .status(401)
        .json({ message: "token inexistente" });
    }

      await usuario.update({
        refreshToken: null
      });
      req.nombreUsuario = usuario.get('nombreUsuario');
      next();
      res.status(200).send({
        message: "Sesión cerrada exitosamente",
      });

    })
    .catch((err) => {
      res.status(500).json({ message: "Error interno del servidor" });
    });
};

exports.refreshToken = (req, res) => {

  const refreshToken = req.params.token;

  if (!refreshToken) return res.sendStatus(401).json({ message:  refreshToken});

  // Se busca el usuario por refreshToken
  Usuario.findOne({ where: { refreshToken } })
    .then(async (usuario) => {
      if (!usuario) {
        return res
          .status(401)
          .json({ message: "token inexistente" });
      }


      const newToken = jwt.sign(
        {
          nombreUsuario: usuario.nombreUsuario,
          id: usuario.idUsuario,
          rol: usuario.rol,
        },
        "secret_key",
        { expiresIn: "15m" }
      );

      res.json({newToken});
    })
    .catch((err) => {
      res.status(500).json({ message: "Error interno del servidor" });
    });
};

function validarContrasena(contrasena) {
  return (
    contrasena.length >= 8 &&
    /[A-Z]/.test(contrasena) && 
    /[a-z]/.test(contrasena) && 
    /[0-9]/.test(contrasena) && 
    /[@#$%^&*_!.]/.test(contrasena) 
  );

}
