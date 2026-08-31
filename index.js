import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Permite recibir JSON en los endpoints

// Configuración de puertos y base de datos
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI ||'mongodb://localhost:27017/galacticapp_db';

// Conexión a MongoDB
mongoose.connect(MONGO_URI)
.then(() => console.log('Conectado exitosamente a MongoDB'))
.catch((error) => console.error('Error conectando a MongoDB:', error));

// Ruta de prueba
app.get('/', (req, res) => {
res.send('API de GalacticApp funcionando correctamente');
});

// Iniciar servidor
app.listen(PORT, () => {
console.log(`Servidor escuchando en el puerto ${PORT}`);
});

app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'success', 
    mensaje: '¡Comunicación exitosa desde el Backend de GalacticApp!' 
  });
});