"""Error controlado del autoservicio de contraseñas (FNC-174)."""


class ErrorAutoservicio(Exception):
    """Excepción controlada con mensaje para el usuario y código HTTP."""

    def __init__(self, mensaje, codigo_http=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo_http = codigo_http
