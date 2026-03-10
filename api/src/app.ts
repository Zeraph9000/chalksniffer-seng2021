import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import path from 'path';

const app = express();
app.use(express.json());

const swaggerDoc = parse(readFileSync(path.join(__dirname, '../../.github/workflows/endpoints.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
