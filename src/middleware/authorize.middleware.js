export function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuarioAutenticado?.rolId)) {
      return res.status(403).json({
        mensaje: 'No tienes permisos para realizar esta acción',
      });
    }
    return next();
  };
}
