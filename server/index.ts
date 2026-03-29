import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './db';

// Routes
import dashboardRouter from './routes/dashboard';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import stockRouter from './routes/stock';
import invoicesRouter from './routes/invoices';
import customersRouter from './routes/customers';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize DB
initializeDatabase();

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/customers', customersRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist/client')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist/client/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Mcom server running on http://localhost:${PORT}`);
});

export default app;
