import express from 'express';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Registry, Counter, Gauge } from 'prom-client';
import dotenv from 'dotenv';
import { logger } from '../logger';

// Interfaces para los resultados de las consultas
interface CountResult {
  count: number;
}

interface LanguageStats {
  lang: string | null;
  count: number;
}

interface LastIndexedResult {
  latest: number;
}

class MetricsExporter {
  private register: Registry;
  private app: express.Application;
  private readonly port: number;
  private readonly dbPath: string;
  private readonly logsPath: string;

  private postCounter: Counter;
  private errorCounter: Counter;
  private postsByLangGauge: Gauge;
  private lastIndexedGauge: Gauge;

  constructor() {
    this.port = Number(process.env.METRICS_PORT) || 9091;
    this.dbPath = process.env.FEEDGEN_SQLITE_LOCATION || 'aroace-feed.db';
    this.logsPath = join(process.cwd(), 'logs');
    
    // Inicializar registro y métricas
    this.register = new Registry();
    this.initializeMetrics();
    
    // Configurar Express
    this.app = express();
    this.setupRoutes();
  }

  private initializeMetrics() {
    this.postCounter = new Counter({
      name: 'feed_posts_total',
      help: 'Total number of posts in feed',
      registers: [this.register]
    });

    this.errorCounter = new Counter({
      name: 'feed_errors_total',
      help: 'Total number of errors',
      registers: [this.register]
    });

    this.postsByLangGauge = new Gauge({
      name: 'feed_posts_by_language',
      help: 'Number of posts by language',
      labelNames: ['lang'],
      registers: [this.register]
    });

    this.lastIndexedGauge = new Gauge({
      name: 'feed_last_indexed_timestamp',
      help: 'Timestamp of last indexed post',
      registers: [this.register]
    });
  }

  private async processLogs() {
    try {
      const errorLogs = await fs.readFile(join(this.logsPath, 'error-current.log'), 'utf-8');
      const errorCount = errorLogs.split('\n').filter(line => line.trim()).length;
      this.errorCounter.reset();
      this.errorCounter.inc(errorCount);
    } catch (error) {
      logger.error('Error processing logs:', error);
    }
  }

  private processDatabase() {
    try {
      const db = new Database(this.dbPath);
      
      // Consultar total de posts
      const totalPosts = db.prepare('SELECT COUNT(*) as count FROM post').get() as CountResult;
      this.postCounter.reset();
      this.postCounter.inc(totalPosts.count);

      // Consultar posts por idioma
      const langStats = db.prepare('SELECT lang, COUNT(*) as count FROM post GROUP BY lang').all() as LanguageStats[];
      this.postsByLangGauge.reset();
      langStats.forEach(row => {
        this.postsByLangGauge.set({ lang: row.lang || 'unknown' }, row.count);
      });

      // Consultar último post indexado
      const lastIndexed = db.prepare('SELECT MAX(strftime("%s", indexedAt)) as latest FROM post').get() as LastIndexedResult;
      this.lastIndexedGauge.set(lastIndexed.latest);

      db.close();
    } catch (error) {
      logger.error('Error processing database:', error);
    }
  }

  private setupRoutes() {
    this.app.get('/metrics', async (req, res) => {
      try {
        await this.processLogs();
        this.processDatabase();
        res.set('Content-Type', this.register.contentType);
        res.end(await this.register.metrics());
      } catch (error) {
        logger.error('Error serving metrics:', error);
        res.status(500).end(String(error));
      }
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      logger.info(`Metrics exporter listening on port ${this.port}`);
    });
  }
}

export const metricsExporter = new MetricsExporter();