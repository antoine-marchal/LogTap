import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { dirname } from 'path';

export function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const PID_FILE = '/tmp/logtap.pid';

export function writePidFile(pid = process.pid) {
  try {
    writeFileSync(PID_FILE, pid.toString(), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function readPidFile() {
  try {
    if (existsSync(PID_FILE)) {
      return parseInt(readFileSync(PID_FILE, 'utf-8'), 10);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function removePidFile() {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // Ignore errors
  }
}

export function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'error':
      console.error(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'info':
      console.info(prefix, message, ...args);
      break;
    case 'debug':
      console.debug(prefix, message, ...args);
      break;
    default:
      console.log(prefix, message, ...args);
  }
}

export function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return Boolean(value);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  formatUptime,
  formatDate,
  formatNumber,
  writePidFile,
  readPidFile,
  removePidFile,
  isProcessRunning,
  log,
  parseBoolean,
  sleep
};
