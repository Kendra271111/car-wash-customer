import 'dotenv/config' // if not loaded in app entry
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_POOLER_URL, // must match .env
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export default prisma