const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

module.exports = (serverExpress) => {
  serverExpress.use(express.json()); 
  serverExpress.use(express.urlencoded({ extended: false }));
  serverExpress.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }));

  // Conectar MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piedrapapeltijera')
    .then(() => console.log('MongoDB conectado'))
    .catch(err => console.error('Error MongoDB:', err));

  serverExpress.use('/api/ranking', require('./config_enrutamiento/endpointsRanking'));
  serverExpress.use('/api/game', require('./config_enrutamiento/endpointsGame'));
};
