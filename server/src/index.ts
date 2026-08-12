import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inventoryRoutes from './routes/inventory';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '12mb' }));

// Routes
app.use('/api/inventory', inventoryRoutes);

app.get('/health', (req, res) => {
  res.send('Server is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
