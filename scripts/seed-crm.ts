import { config } from "dotenv";
import { faker } from "@faker-js/faker";
import { SQL } from "bun";

config({ path: ".env.local" });

const url = process.env.CRM_DEMO_DATABASE_URL;
if (!url) {
  throw new Error("CRM_DEMO_DATABASE_URL manquante dans .env.local");
}

faker.seed(4242);
const NOW = new Date("2026-04-30T12:00:00Z");
const HISTORY_MONTHS = 12;

const TARGET_REPS = 5;
const TARGET_COMPANIES = 200;
const TARGET_CONTACTS = 1500;
const TARGET_DEALS = 800;
const TARGET_ACTIVITIES = 5000;

const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Fintech",
  "Healthtech",
  "Edtech",
  "Marketplace",
  "Agency",
  "Manufacturing",
  "Retail",
  "Consulting",
] as const;

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
const COUNTRIES = ["France", "Germany", "United Kingdom", "Spain", "Italy", "Netherlands", "Belgium", "United States"] as const;
const SEGMENTS = ["SMB", "Mid-market", "Enterprise"] as const;
const DEAL_SOURCES = ["inbound", "outbound", "referral", "partner", "event", "marketing"] as const;
const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const;
const ROLES = ["sdr", "ae", "ae", "ae", "manager"] as const;

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })] as T;
}

function pickWeighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const it of items) {
    if (r < it.weight) return it.value;
    r -= it.weight;
  }
  return items[items.length - 1]!.value;
}

function dateMonthsAgo(months: number): Date {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
}

const sql = new SQL(url);

async function main(): Promise<void> {
  console.log("→ Drop tables (si existantes)…");
  await sql`DROP TABLE IF EXISTS activities CASCADE`;
  await sql`DROP TABLE IF EXISTS deals CASCADE`;
  await sql`DROP TABLE IF EXISTS contacts CASCADE`;
  await sql`DROP TABLE IF EXISTS companies CASCADE`;
  await sql`DROP TABLE IF EXISTS sales_reps CASCADE`;
  await sql`DROP TABLE IF EXISTS pipelines CASCADE`;

  console.log("→ Création schéma CRM…");
  await sql`
    CREATE TABLE pipelines (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      stages JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE sales_reps (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'ae',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE companies (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      size TEXT NOT NULL,
      country TEXT NOT NULL,
      mrr_cents INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE contacts (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
      lifecycle_stage TEXT NOT NULL,
      segment TEXT NOT NULL,
      owner_id BIGINT REFERENCES sales_reps(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE deals (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
      company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
      stage TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      close_date DATE,
      owner_id BIGINT REFERENCES sales_reps(id) ON DELETE SET NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE activities (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('call','email','meeting','note')),
      contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
      deal_id BIGINT REFERENCES deals(id) ON DELETE SET NULL,
      owner_id BIGINT REFERENCES sales_reps(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("→ Activation RLS (privilèges admin Postgres bypass)…");
  for (const t of ["pipelines", "sales_reps", "companies", "contacts", "deals", "activities"]) {
    await sql.unsafe(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }

  console.log("→ Seed pipelines…");
  await sql`
    INSERT INTO pipelines (name, stages)
    VALUES (
      'Sales pipeline',
      ${JSON.stringify(["discovery", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"])}::jsonb
    )
  `;

  console.log(`→ Seed ${TARGET_REPS} sales reps…`);
  const repsToInsert = Array.from({ length: TARGET_REPS }, (_, i) => {
    const name = faker.person.fullName();
    const slug = name.toLowerCase().replace(/[^a-z]/g, "");
    return {
      name,
      email: `${slug}.rep${i + 1}@crmdemo.test`,
      role: ROLES[i] ?? "ae",
      created_at: dateMonthsAgo(HISTORY_MONTHS + 6).toISOString(),
    };
  });
  for (const r of repsToInsert) {
    await sql`INSERT INTO sales_reps (name, email, role, created_at) VALUES (${r.name}, ${r.email}, ${r.role}, ${r.created_at})`;
  }
  const reps = (await sql`SELECT id FROM sales_reps ORDER BY id`) as Array<{ id: number }>;

  console.log(`→ Seed ${TARGET_COMPANIES} companies…`);
  for (let i = 0; i < TARGET_COMPANIES; i++) {
    const segment = pickWeighted([
      { value: "SMB", weight: 0.55 },
      { value: "Mid-market", weight: 0.3 },
      { value: "Enterprise", weight: 0.15 },
    ]);
    const baseSizeIdx = segment === "SMB" ? 0 : segment === "Mid-market" ? 2 : 4;
    const sizeIdx = Math.min(baseSizeIdx + faker.number.int({ min: 0, max: 1 }), COMPANY_SIZES.length - 1);
    const mrr = segment === "Enterprise"
      ? faker.number.int({ min: 5000_00, max: 50000_00 })
      : segment === "Mid-market"
        ? faker.number.int({ min: 500_00, max: 5000_00 })
        : faker.number.int({ min: 0, max: 500_00 });
    await sql`
      INSERT INTO companies (name, industry, size, country, mrr_cents, created_at)
      VALUES (
        ${faker.company.name()},
        ${pick(INDUSTRIES)},
        ${COMPANY_SIZES[sizeIdx]!},
        ${pick(COUNTRIES)},
        ${mrr},
        ${faker.date.between({ from: dateMonthsAgo(HISTORY_MONTHS + 12), to: NOW }).toISOString()}
      )
    `;
  }
  const companies = (await sql`SELECT id FROM companies ORDER BY id`) as Array<{ id: number }>;

  console.log(`→ Seed ${TARGET_CONTACTS} contacts…`);
  for (let i = 0; i < TARGET_CONTACTS; i++) {
    const fname = faker.person.firstName();
    const lname = faker.person.lastName();
    const company = pick(companies);
    await sql`
      INSERT INTO contacts (name, email, phone, company_id, lifecycle_stage, segment, owner_id, created_at)
      VALUES (
        ${`${fname} ${lname}`},
        ${`${fname.toLowerCase()}.${lname.toLowerCase()}.${i + 1}@${faker.internet.domainName()}`.replace(/[^a-z0-9.@]/g, "")},
        ${faker.phone.number()},
        ${company.id},
        ${pickWeighted([
          { value: "lead", weight: 0.4 },
          { value: "marketing_qualified", weight: 0.2 },
          { value: "sales_qualified", weight: 0.15 },
          { value: "opportunity", weight: 0.1 },
          { value: "customer", weight: 0.12 },
          { value: "evangelist", weight: 0.03 },
        ])},
        ${pick(SEGMENTS)},
        ${pick(reps).id},
        ${faker.date.between({ from: dateMonthsAgo(HISTORY_MONTHS), to: NOW }).toISOString()}
      )
    `;
  }
  const contacts = (await sql`SELECT id, company_id FROM contacts ORDER BY id`) as Array<{ id: number; company_id: number }>;

  console.log(`→ Seed ${TARGET_DEALS} deals…`);
  for (let i = 0; i < TARGET_DEALS; i++) {
    const contact = pick(contacts);
    const stage = pickWeighted([
      { value: "discovery", weight: 0.2 },
      { value: "qualified", weight: 0.2 },
      { value: "proposal", weight: 0.15 },
      { value: "negotiation", weight: 0.1 },
      { value: "closed_won", weight: 0.2 },
      { value: "closed_lost", weight: 0.15 },
    ]);
    const amount = faker.number.int({ min: 1000_00, max: 50000_00 });
    const isClosed = stage === "closed_won" || stage === "closed_lost";
    const created = faker.date.between({ from: dateMonthsAgo(HISTORY_MONTHS), to: NOW });
    const close = isClosed
      ? faker.date.between({ from: created, to: NOW }).toISOString().slice(0, 10)
      : null;
    await sql`
      INSERT INTO deals (name, contact_id, company_id, stage, amount_cents, close_date, owner_id, source, created_at)
      VALUES (
        ${`Deal #${i + 1} — ${faker.commerce.productName()}`},
        ${contact.id},
        ${contact.company_id},
        ${stage},
        ${amount},
        ${close},
        ${pick(reps).id},
        ${pick(DEAL_SOURCES)},
        ${created.toISOString()}
      )
    `;
  }
  const deals = (await sql`SELECT id, contact_id FROM deals ORDER BY id`) as Array<{ id: number; contact_id: number }>;

  console.log(`→ Seed ${TARGET_ACTIVITIES} activities…`);
  for (let i = 0; i < TARGET_ACTIVITIES; i++) {
    const deal = faker.number.float() < 0.7 ? pick(deals) : null;
    const contact_id = deal ? deal.contact_id : pick(contacts).id;
    const completed = faker.date.between({ from: dateMonthsAgo(HISTORY_MONTHS), to: NOW });
    await sql`
      INSERT INTO activities (type, contact_id, deal_id, owner_id, completed_at, created_at)
      VALUES (
        ${pick(ACTIVITY_TYPES)},
        ${contact_id},
        ${deal ? deal.id : null},
        ${pick(reps).id},
        ${completed.toISOString()},
        ${completed.toISOString()}
      )
    `;
  }

  console.log("");
  console.log("=== Récap ===");
  for (const t of ["pipelines", "sales_reps", "companies", "contacts", "deals", "activities"]) {
    const result = (await sql.unsafe(`SELECT count(*) AS c FROM ${t}`)) as Array<{ c: number }>;
    console.log(`  ${t}: ${result[0]?.c ?? "?"}`);
  }
  console.log("");
  console.log("Done. Le projet CRM_DEMO Supabase est prêt.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("SEED FAILED:", err);
  await sql.end();
  process.exit(1);
});
