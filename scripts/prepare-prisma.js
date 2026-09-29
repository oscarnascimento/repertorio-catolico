const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', '.env');

// Try loading local .env if process.env.DATABASE_URL is not set
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
  if (match) {
    dbUrl = match[1];
  }
}

// Determine target provider based on DATABASE_URL
const isPostgres = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  const currentProviderMatch = schema.match(/provider\s*=\s*["']([^"']+)["']/);
  const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

  if (currentProvider !== targetProvider) {
    schema = schema.replace(
      /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*["'][^"']+["']/,
      `datasource db {\n  provider = "${targetProvider}"`
    );
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log(`[Prisma Auto-Config] Configurado para ${targetProvider.toUpperCase()} (${isPostgres ? 'Produção / Supabase' : 'Local / SQLite'})`);
  } else {
    console.log(`[Prisma Auto-Config] Já configurado para ${targetProvider.toUpperCase()}`);
  }
}
