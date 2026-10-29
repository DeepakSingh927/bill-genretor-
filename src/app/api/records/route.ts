import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  turso,
  getTursoClients,
  getTursoBills,
  getTursoMaxSeq,
  syncBatchToTurso,
  deleteTursoBillsByIds,
} from "@/lib/turso";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

function readDiskBackup() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not read disk backup:", err);
  }
  return null;
}

function writeDiskBackup(payload: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    // Read-only or serverless host
  }
}

export async function GET() {
  try {
    // 1. If Turso Cloud Database is configured
    if (turso) {
      const clients = await getTursoClients();
      const bills = await getTursoBills();
      const maxSeq = await getTursoMaxSeq();

      // If Turso has data, return it
      if (clients.length > 0 || bills.length > 0) {
        return NextResponse.json({
          source: "turso-cloud",
          clients,
          bills,
          maxSeq,
        });
      }

      // If Turso is empty but we have local records, auto-migrate them to Turso!
      const diskData = readDiskBackup();
      if (diskData && (diskData.clients?.length > 0 || diskData.bills?.length > 0)) {
        console.log("Migrating local records to Turso cloud database...");
        await syncBatchToTurso(
          diskData.clients || [],
          diskData.bills || [],
          diskData.maxSeq || 1000
        );
        return NextResponse.json({
          source: "turso-cloud-migrated",
          clients: diskData.clients || [],
          bills: diskData.bills || [],
          maxSeq: diskData.maxSeq || 1000,
        });
      }
    }

    // 2. Fallback to local disk file
    const disk = readDiskBackup();
    if (disk) {
      return NextResponse.json({
        source: "local-disk",
        clients: disk.clients || [],
        bills: disk.bills || [],
        maxSeq: disk.maxSeq || 1000,
      });
    }
  } catch (error) {
    console.error("Error in GET /api/records:", error);
  }

  return NextResponse.json({ source: "empty", clients: null, bills: null, maxSeq: 1000 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clients, bills, maxSeq } = body;

    const safeClients = clients || [];
    const safeBills = bills || [];
    const safeMaxSeq = maxSeq || 1000;

    // 1. Save to Turso Cloud
    if (turso) {
      await syncBatchToTurso(safeClients, safeBills, safeMaxSeq);
    }

    // 2. Mirror to disk
    writeDiskBackup({
      clients: safeClients,
      bills: safeBills,
      maxSeq: safeMaxSeq,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      tursoConnected: Boolean(turso),
      count: safeBills.length,
    });
  } catch (error: any) {
    console.error("Error in POST /api/records:", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { billIds } = body;

    if (Array.isArray(billIds) && billIds.length > 0) {
      if (turso) {
        await deleteTursoBillsByIds(billIds);
      }

      const disk = readDiskBackup();
      if (disk && Array.isArray(disk.bills)) {
        disk.bills = disk.bills.filter((b: any) => !billIds.includes(b.id));
        writeDiskBackup(disk);
      }

      return NextResponse.json({ success: true, deletedCount: billIds.length });
    }

    return NextResponse.json({ success: false, message: "No bill IDs provided" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in DELETE /api/records:", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
