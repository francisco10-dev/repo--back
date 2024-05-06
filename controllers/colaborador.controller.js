    const enviarCorreo = require('./gmail.controller')   // instancia de la funcion enviar correo 
    const db = require('../models');
    const Colaborador = db.colaborador;
    const Usuario = db.usuario;
    const Puesto = db.puesto;
    const fs = require('fs');
    const { parseString } = require('xml2js');

    exports.createColaborador = async (req, res, next) => {

            if (Object.keys(req.body).length === 0) {
                return res.status(400).send({
                    message: 'No puede venir sin datos'
                });
            }

            Colaborador.create(req.body)
                .then(async data => {
                    res.status(200).send({
                    message: `Agregada correctamente la solicitud de ${req.body.nombre}`,
                    data:data
            }); 
            req.id = data.idColaborador; 
            next();
            //datos que se vana a necesitar, basicamente definimos correos y demas
            const from = '"Se agregó como un nuevo colaborador" <dgadeaio4@gmail.com>';
            const toList = [req.body.correoElectronico];  // el otro correo es de prueba para ver si se puede hacer con mas de uno, tienen que cambiarlo, ademas de que eso hace que se cree una lista de correos
            const subject = "Nuevo colaborador";// agregar los correos necesarios para notificar de los nuevos colaboradores 
            const htmlContent = `
                <style>
                    h2 {
                        color: #333;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        padding: 10px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                </style>
                <h2>Informacion del nuevo colaborador</h2>
                <table>
                    <tr>
                        <th>Información</th>
                        <th>Datos</th>
                    </tr>
                    <tr>
                        <td>Nombre:</td>
                        <td>${req.body.nombre}</td>
                    </tr>
                    <tr>
                        <td>Correo:</td>
                        <td>${req.body.correoElectronico}</td>
                    </tr>
                </table>
            `;
            await enviarCorreo(toList, subject, htmlContent, from);  // forma de utilizar la funcion global
            
        })
            .catch(err => {
                res.status(500).send({
                  message:
                    err.message || 'Ocurrió un error al crear la solicitud.'
                });
              });
    };
    
    exports.findAllColaboradores = async (req, res, next) => {
        Colaborador.findAll({
            include: [
                {
                    model: Puesto,
                    as: 'puesto',
                }
            ]
        })
        .then(data => {
            res.send(data);
        })  
        .catch(err => {
            res.status(500).send({
            message: err.message || 'Ocurrió un error al obtener los colaboradores.'
            });
        });
    };

    exports.findOneColaborador = async (req, res) => {
        const id = req.params.id;
    
        Colaborador.findByPk(id, {
            include: [
                {
                    model: Puesto,
                    as: 'puesto',
                }
            ]
        })
        .then(data => {
            if (!data) {
            res.status(404).send({
                message: `No se encontró un colaborador con ID ${id}`
            });
            } else {
            res.send(data);
            }
        })
        .catch(err => {
            res.status(500).send({
            message: `Ocurrió un error al obtener el colaborador con ID ${id}`
            });
        });
    };

    exports.updateColaborador = async (req, res,next) => {
        const id = req.params.id;
    
        Colaborador.findByPk(id)
        .then(colaborador => {
            if (!colaborador) {
            res.status(404).send({
                message: `No se encontró un colaborador con ID ${id}`
            });
            } else {

            req.datos = {...colaborador.get()};

            colaborador.update(req.body)
                .then(() => {
                res.status(200).send({
                    message: `Actualizado correctamente el colaborador con ID ${id}`,
                    colaborador: colaborador
                });
                next();
                })
                .catch(err => {
                res.status(500).send({
                    message: `Ocurrió un error al actualizar el colaborador con ID ${id}: ${err.message}`
                });
                });
            }
        })
        .catch(err => {
            res.status(500).send({
            message: `Ocurrió un error al obtener el colaborador con ID ${id}: ${err.message}`
            });
        });
    };

    exports.deleteColaborador = async (req, res, next) => {
        const id = req.params.id;
    
        Colaborador.findByPk(id)
        .then(colaborador => {
            if (!colaborador) {
            res.status(404).send({
                message: `No se encontró un colaborador con ID ${id}`
            });
            } else {

            req.datos = {...colaborador.get()};

            colaborador.destroy()
                .then(() => {
                res.send({
                    message: 'El colaborador fue eliminado exitosamente'
                });
                })
                .catch(err => {
                res.status(500).send({
                    message: err.message || `Ocurrió un error al eliminar el colaborador con ID ${id}`
                });
                //next();
                });
            }
        })
        .catch(err => {
            res.status(500).send({
            message: `Ocurrió un error al obtener el colaborador con ID ${id}`
            });
        });
    };

    
    exports.findColaboradoresSinUsuario = async (req, res) => {
        try {
        // Obtener todos los colaboradores
        const colaboradores = await Colaborador.findAll();
    
        // Obtener todos los usuarios y extraer los id de colaborador
        const usuarios = await Usuario.findAll();
        const idsColaboradoresConUsuario = usuarios.map(usuario => usuario.idColaborador);
    
        // Filtrar colaboradores que no tienen usuario asignado
        const colaboradoresSinUsuario = colaboradores.filter(colaborador => !idsColaboradoresConUsuario.includes(colaborador.idColaborador));
    
        if (colaboradoresSinUsuario.length === 0) {
            return res.status(404).send({
            message: 'No se encontraron colaboradores sin usuario asignado',
            });
        }
    
        return res.send(colaboradoresSinUsuario);
        } catch (error) {
        return res.status(500).send({
            message: `Ocurrió un error al obtener los colaboradores sin usuario: ${error.message}`,
        });
        }
    };
    // Funciones definidas fuera de la IIFE
    const nombresCumpleanierosHoy = (colaboradores) => {
        const hoy = new Date();
        return colaboradores
            .filter(colaborador => {
                const fechaNacimiento = colaborador.fechaNacimiento.split('-');
                const diaNacimiento = parseInt(fechaNacimiento[2], 10); // Día de nacimiento
                const mesNacimiento = parseInt(fechaNacimiento[1], 10) - 1; // Mes de nacimiento (restar 1 porque los meses se indexan desde 0)
                return diaNacimiento === hoy.getDate() && mesNacimiento === hoy.getMonth();
            })
            .map(colaborador => colaborador.nombre);
    };

    const enviarCorreoCumpleanieros = async () => {
        const colaboradores = await Colaborador.findAll(); // Se obtienen todos los colaboradores
        const nombresCumpleanieros = nombresCumpleanierosHoy(colaboradores);
        // Verificar si hay cumpleañeros hoy
        if (nombresCumpleanieros.length === 0) {
            console.log('No hay cumpleañeros hoy');
            return;
        }
    
        // Leer el archivo XML que contiene los mensajes
        const xmlString = fs.readFileSync('../mensajes/mensaje_cumpleanios.xml', 'utf8');
    
        let mensajes = {};
    
        // Parsear el XML para obtener los mensajes
        parseString(xmlString, (err, result) => {
            if (err) {
                console.error('Error al parsear el archivo XML:', err);
                return;
            }
            mensajes = result.mensajes.mensaje.reduce((acc, mensaje) => {
                acc[mensaje.$.tipo] = {
                    asunto: mensaje.asunto[0],
                    contenido: mensaje.contenido[0]
                };
                return acc;
            }, {});
        });
    
        // Esperar un momento para que se complete la lectura y el parseo del XML
        setTimeout(() => {
            const listaCorreos = colaboradores.map(colaborador => {
                let mensaje = mensajes.cumpleanos.contenido.replace('{nombre}', colaborador.nombre);
    
                let asunto = mensajes.cumpleanos.asunto;
    
                if (!nombresCumpleanieros.includes(colaborador.nombre)) {
                    mensaje = mensajes.otro.contenido.replace('{nombre}', colaborador.nombre);
                    asunto = mensajes.otro.asunto.replace('{nombre}', colaborador.nombre)
                        .replace('{cumpleanieros}', nombresCumpleanieros.map(nombre => `<li>${nombre}</li>`).join(''));
                }
    
                return {
                    correo: colaborador.correoElectronico,
                    asunto: asunto,
                    mensaje: mensaje
                };
            });
    
            const from = "Informacion relevante";
    
            for (const { correo, asunto, mensaje } of listaCorreos) {
                enviarCorreo([correo], asunto, mensaje, from);
            }
    
            console.log('Correos enviados correctamente');
        }, 100);
    };

    const ejecutarFuncionDiaria = (hora, minuto, funcion) => { 
        const ahora = new Date();
        let horaDeseada = new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            hora,
            minuto,
            0,
            0
        );

        if (ahora > horaDeseada) {
            // Si la hora deseada ya pasó hoy, programarla para mañana
            horaDeseada.setDate(horaDeseada.getDate() + 1);      // asignacion para el siguiente dia
            console.log('Programar la siguiente ejecución para:', horaDeseada);

        }

        // Calcular el tiempo restante para la próxima ejecución
        const tiempoParaEjecutar = horaDeseada - ahora;

        // Programar la ejecución de la función usando setTimeout
        setTimeout(() => {
            funcion();
            // Programar la siguiente ejecución para cierta hora
            ejecutarFuncionDiaria(hora, minuto, funcion);
        }, tiempoParaEjecutar);
    };

    // Inicialización de la IIFE
    (async () => {
        console.log('Colaborador'); // Verificación de carga del archivo
        try {
            // Configurar la hora y el minuto deseados para enviar el correo
            const horaDeseada = 3; // 03:00 AM la mejor hora para hacerlo
            const minutoDeseado = 1;

            // Ejecutar la función una vez al día a la hora deseada
            ejecutarFuncionDiaria(horaDeseada, minutoDeseado, enviarCorreoCumpleanieros);
        } catch (error) {
            console.error('Ocurrió un error:', error.message);
        }
    })();

        