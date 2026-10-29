import { createClient } from "@libsql/client";
import { Client, SavedBill, SavedBillItem } from "@/types/bill";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const turso = url && authToken ? createClient({ url, authToken }) : null;

let tablesInitialized = false;

export async function initTurso() {
  if (!turso || tablesInitialized) return;

  try {
    await turso.executeMultiple(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        hotel_name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        bill_number TEXT UNIQUE NOT NULL,
        client_id TEXT,
        hotel_name TEXT NOT NULL,
        client_phone TEXT,
        client_address TEXT,
        date TEXT NOT NULL,
        items_json TEXT NOT NULL,
        total_amount REAL NOT NULL,
        item_count INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
      CREATE INDEX IF NOT EXISTS idx_bills_client_id ON bills(client_id);
      CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
      CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
      CREATE INDEX IF NOT EXISTS idx_clients_hotel_name ON clients(hotel_name);
    `);
    tablesInitialized = true;
    console.log("Turso Cloud Database tables initialized successfully.");
  } catch (error) {
    console.error("Error initializing Turso tables:", error);
  }
}

export async function getTursoClients(): Promise<Client[]> {
  if (!turso) return [];
  await initTurso();

  try {
    const result = await turso.execute("SELECT * FROM clients ORDER BY created_at DESC");
    return result.rows.map((row: any) => ({
      id: String(row.id),
      hotelName: String(row.hotel_name),
      contactPerson: row.contact_person ? String(row.contact_person) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
      address: row.address ? String(row.address) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    }));
  } catch (error) {
    console.error("Error fetching clients from Turso:", error);
    return [];
  }
}

export async function getTursoBills(): Promise<SavedBill[]> {
  if (!turso) return [];
  await initTurso();

  try {
    const result = await turso.execute("SELECT * FROM bills ORDER BY created_at DESC");
    return result.rows.map((row: any) => {
      let items: SavedBillItem[] = [];
      try {
        items = JSON.parse(String(row.items_json));
      } catch {
        items = [];
      }

      return {
        id: String(row.id),
        billNumber: String(row.bill_number),
        clientId: row.client_id ? String(row.client_id) : undefined,
        hotelName: String(row.hotel_name),
        clientPhone: row.client_phone ? String(row.client_phone) : undefined,
        clientAddress: row.client_address ? String(row.client_address) : undefined,
        date: String(row.date),
        items,
        totalAmount: Number(row.total_amount),
        itemCount: Number(row.item_count),
        status: (String(row.status) as "active" | "archived" | "cancelled") || "active",
        notes: row.notes ? String(row.notes) : undefined,
        createdAt: String(row.created_at || new Date().toISOString()),
        updatedAt: String(row.updated_at || new Date().toISOString()),
      };
    });
  } catch (error) {
    console.error("Error fetching bills from Turso:", error);
    return [];
  }
}

export async function getTursoMaxSeq(): Promise<number> {
  if (!turso) return 1000;
  await initTurso();

  try {
    const result = await turso.execute("SELECT value FROM meta WHERE key = 'max_seq'");
    if (result.rows.length > 0 && result.rows[0].value) {
      return parseInt(String(result.rows[0].value), 10) || 1000;
    }
  } catch (error) {
    console.error("Error fetching max_seq from Turso:", error);
  }
  return 1000;
}

export async function saveTursoClient(client: Client) {
  if (!turso) return;
  await initTurso();

  try {
    await turso.execute({
      sql: `INSERT INTO clients (id, hotel_name, contact_person, phone, address, notes, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              hotel_name = excluded.hotel_name,
              contact_person = excluded.contact_person,
              phone = excluded.phone,
              address = excluded.address,
              notes = excluded.notes,
              is_active = excluded.is_active,
              updated_at = excluded.updated_at`,
      args: [
        client.id,
        client.hotelName,
        client.contactPerson || null,
        client.phone || null,
        client.address || null,
        client.notes || null,
        client.isActive ? 1 : 0,
        client.createdAt,
        client.updatedAt,
      ],
    });
  } catch (error) {
    console.error("Error saving client to Turso:", error);
  }
}

export async function saveTursoBill(bill: SavedBill) {
  if (!turso) return;
  await initTurso();

  try {
    await turso.execute({
      sql: `INSERT INTO bills (id, bill_number, client_id, hotel_name, client_phone, client_address, date, items_json, total_amount, item_count, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              bill_number = excluded.bill_number,
              client_id = excluded.client_id,
              hotel_name = excluded.hotel_name,
              client_phone = excluded.client_phone,
              client_address = excluded.client_address,
              date = excluded.date,
              items_json = excluded.items_json,
              total_amount = excluded.total_amount,
              item_count = excluded.item_count,
              status = excluded.status,
              notes = excluded.notes,
              updated_at = excluded.updated_at`,
      args: [
        bill.id,
        bill.billNumber,
        bill.clientId || null,
        bill.hotelName,
        bill.clientPhone || null,
        bill.clientAddress || null,
        bill.date,
        JSON.stringify(bill.items),
        bill.totalAmount,
        bill.itemCount,
        bill.status || "active",
        bill.notes || null,
        bill.createdAt,
        bill.updatedAt,
      ],
    });
  } catch (error) {
    console.error("Error saving bill to Turso:", error);
  }
}

export async function syncBatchToTurso(clients: Client[], bills: SavedBill[], maxSeq: number) {
  if (!turso) return;
  await initTurso();

  try {
    // Upsert maxSeq
    await turso.execute({
      sql: `INSERT INTO meta (key, value) VALUES ('max_seq', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [String(maxSeq)],
    });

    for (const client of clients) {
      await saveTursoClient(client);
    }

    for (const bill of bills) {
      await saveTursoBill(bill);
    }
  } catch (error) {
    console.error("Error batch syncing to Turso:", error);
  }
}

export async function deleteTursoBillsByIds(ids: string[]): Promise<number> {
  if (!turso || ids.length === 0) return 0;
  await initTurso();

  try {
    const placeholders = ids.map(() => "?").join(",");
    const result = await turso.execute({
      sql: `DELETE FROM bills WHERE id IN (${placeholders})`,
      args: ids,
    });
    return result.rowsAffected || ids.length;
  } catch (error) {
    console.error("Error deleting bills in Turso:", error);
    return 0;
  }
}
