require('dotenv').config(); 

const configExpress = require('express'); 
const configPipeline = require('./config_server_express/config_pipeline'); 
const http = require('http');
const { Server } = require('socket.io');


const serverExpress = configExpress();
const httpServer = http.createServer(serverExpress);  // ← Servidor HTTP para sockets
const io = new Server(httpServer, {  //Socket.io
  cors: {
    origin: "http://localhost:5173",  // React
    methods: ["GET", "POST"]
  }
});

require('./config_server_express/config_enrutamiento/sockets/gameHandler')(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, (error) => { 
  if(error){
    console.log(`error al levantar el servidor: ${error}`);
  } else {
    console.log(`....servidor escuchando en puerto ${PORT}...`);
  }
});