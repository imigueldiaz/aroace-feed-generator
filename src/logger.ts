import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { ensureDirectoryExists } from './utils';

// Crear directorio logs si no existe
const logsDir = path.join(process.cwd(), 'logs');
ensureDirectoryExists(logsDir);

// Configurar el formato de los logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Crear el logger para archivo
const fileLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Logs diarios rotativos
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      createSymlink: true,
      symlinkName: 'application-current.log',
      zippedArchive: true
    }),
    // Logs de error separados
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      createSymlink: true,
      symlinkName: 'error-current.log',
      zippedArchive: true
    })
  ]
});

// Crear el logger principal (consola + archivo)
export const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Logs de consola
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    ...fileLogger.transports
  ]
});

// Función para loggear solo a archivo
export const logToFile = {
  info: (message: string, ...args: any[]) => {
    fileLogger.info(message, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    fileLogger.debug(message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    fileLogger.error(message, ...args);
  }
};
