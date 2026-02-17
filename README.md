Si da errores a parte de los obvios por la falta de codigo, lo que hay que importar es esto:
- socket.io, socket.io-client, @mediapipe/hands, @mediapipe/camera_utils

El cliente debe iniciarse con el comando ng serve --ssl true --open y debemos darle permisos al navegador para inicializar la cámara.
El endpoint /Juego/GestureDetector apunta a una prueba visual de que la cam y la deteccion de gestos funciona y es accesible públicamente.
