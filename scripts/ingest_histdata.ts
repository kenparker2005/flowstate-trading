import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function parseHistDataDate(dateTimeStr: string): number {
  // Format: YYYYMMDD HHMMSS
  const [datePart, timePart] = dateTimeStr.split(' ');
  const year = parseInt(datePart.slice(0, 4));
  const month = parseInt(datePart.slice(4, 6)) - 1;
  const day = parseInt(datePart.slice(6, 8));
  const hour = parseInt(timePart.slice(0, 2));
  const minute = parseInt(timePart.slice(2, 4));
  const second = parseInt(timePart.slice(4, 6));
  return Math.floor(new Date(Date.UTC(year, month, day, hour, minute, second)).getTime() / 1000);
}

async function ingestCSV(inputPath: string, outputPath: string): Promise<Candle[]> {
  const candles: Candle[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = line.split(';');
    if (parts.length < 5) continue;

    const time = parseHistDataDate(parts[0]);
    const open = parseFloat(parts[1]);
    const high = parseFloat(parts[2]);
    const low = parseFloat(parts[3]);
    const close = parseFloat(parts[4]);
    const volume = parts[5] ? parseFloat(parts[5]) : 0;

    if (isNaN(time) || isNaN(open)) continue;

    candles.push({ time, open, high, low, close, volume });
  }

  fs.writeFileSync(outputPath, JSON.stringify(candles));
  console.log(`Parsed ${candles.length} candles → ${outputPath}`);
  return candles;
}

async function main() {
  const rawDir = path.join(__dirname, '..', 'data', 'raw');
  const processedDir = path.join(__dirname, '..', 'data', 'processed');

  if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

  const csvFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.csv'));
  if (csvFiles.length === 0) {
    console.log('No CSV files found in data/raw/');
    console.log('Download HistData.com ASCII format CSV files and place them there.');
    return;
  }

  for (const file of csvFiles) {
    const inputPath = path.join(rawDir, file);
    const outputName = file.replace('.csv', '.json');
    const outputPath = path.join(processedDir, outputName);
    await ingestCSV(inputPath, outputPath);
  }
}

main().catch(console.error);
