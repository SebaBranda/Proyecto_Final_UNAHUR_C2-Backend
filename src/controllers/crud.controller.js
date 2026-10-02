export function crearControladorCrud({
  repository,
  camposRequeridos,
  valoresPorDefecto = {},
  rol,
  normalizar = (registro) => registro,
  validar = () => null,
  nombre = 'Registro',
}) {
  return {
    async listar(req, res) {
      const resultado = await repository.listar({ rol, usuario: req.query.usuario });
      return res.status(200).json(resultado);
    },

    async obtener(req, res) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ mensaje: 'El ID debe ser un entero positivo' });
      }

      const registro = await repository.buscarPorId(id, { rol });
      if (!registro) return res.status(404).json({ mensaje: `${nombre} no encontrado` });
      return res.status(200).json(registro);
    },

    async crear(req, res) {
      if (!esObjeto(req.body)) {
        return res.status(400).json({ mensaje: 'El cuerpo debe ser un objeto JSON' });
      }

      const registro = normalizar({ ...valoresPorDefecto, ...req.body });
      const error = validarCampos(registro) || await validar(registro, null, repository);
      if (error) return res.status(400).json({ mensaje: error });

      const creado = await repository.crear(registro, { rol });
      return res.status(201).json(creado);
    },

    async actualizar(req, res) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ mensaje: 'El ID debe ser un entero positivo' });
      }
      if (!esObjeto(req.body) || Object.keys(req.body).length === 0) {
        return res.status(400).json({ mensaje: 'Se requiere un objeto JSON con campos para actualizar' });
      }

      const actual = await repository.buscarPorId(id, { rol });
      if (!actual) return res.status(404).json({ mensaje: `${nombre} no encontrado` });

      const actualizado = normalizar({ ...actual, ...req.body, id });
      const error = validarCampos(actualizado) || await validar(actualizado, actual, repository);
      if (error) return res.status(400).json({ mensaje: error });

      const guardado = await repository.actualizar(id, actualizado, { rol });
      if (!guardado) return res.status(404).json({ mensaje: `${nombre} no encontrado` });
      return res.status(200).json(guardado);
    },

    async eliminar(req, res) {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ mensaje: 'El ID debe ser un entero positivo' });
      }

      const eliminado = await repository.eliminar(id, { rol });
      if (!eliminado) return res.status(404).json({ mensaje: `${nombre} no encontrado` });
      return res.status(200).json(eliminado);
    },
  };

  function validarCampos(registro) {
    const faltantes = camposRequeridos.filter((campo) => (
      typeof registro[campo] !== 'string' || registro[campo].trim().length === 0
    ));
    return faltantes.length ? `Se requieren los campos: ${faltantes.join(', ')}` : null;
  }
}

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}