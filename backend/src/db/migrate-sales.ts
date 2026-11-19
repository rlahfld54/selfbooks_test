import { readFile } from 'node:fs/promises';
import { loadConfig } from '../config/env.js';
import { createPool } from './pool.js';
const config=loadConfig();
if(!config.development||!config.databaseUrl) throw new Error('Local development database required');
const pool=createPool(config.databaseUrl,config.caPath);
try {
 const db=await pool.connect();
 try {
  for(const name of ['010_sales_base.sql','011_sales_workbench.sql']) await db.query(await readFile(new URL('../../migrations/'+name,import.meta.url),'utf8'));
  console.log('Sales voucher migrations applied');
 } catch(error) { await db.query('ROLLBACK'); console.error('Migration failed:',(error as {code?:string}).code??'unknown'); process.exitCode=1; }
 finally {db.release()}
} finally {await pool.end()}
