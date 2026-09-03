import "dotenv/config";
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import mainRoute from './routes/index';
import { ErrorHandler } from './middlewares/errorHandler'

const app = express();
const port = 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', mainRoute);
app.use(ErrorHandler)

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the API', routes: ['/api/hello', '/api/profile/:name', '/api/login'] });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});