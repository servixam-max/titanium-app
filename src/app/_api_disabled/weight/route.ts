import pool from "@/lib/pg-pool";
import { NextResponse } from "next/server";

async function getDefaultProfile() {
  const result = await pool.query(
    "SELECT id FROM profiles WHERE email = 'default@titanium.app' LIMIT 1"
  );
  if (result.rows.length > 0) return result.rows[0].id;
  
  const newProfile = await pool.query(
    `INSERT INTO profiles (email, username, created_at, updated_at)
     VALUES ('default@titanium.app', 'Default User', NOW(), NOW())
     RETURNING id`
  );
  return newProfile.rows[0].id;
}

// GET - Obtener historial de peso
export async function GET() {
  try {
    const userId = await getDefaultProfile();
    
    const result = await pool.query(
      `SELECT id, weight, date, created_at 
       FROM weight_logs 
       WHERE user_id = $1 
       ORDER BY date DESC, created_at DESC`,
      [userId]
    );
    
    return NextResponse.json({ weights: result.rows });
  } catch (error) {
    console.error("Error fetching weights:", error);
    return NextResponse.json({ error: "Failed to fetch weights" }, { status: 500 });
  }
}

// POST - Añadir nuevo peso
export async function POST(request: Request) {
  try {
    const userId = await getDefaultProfile();
    const body = await request.json();
    const { weight, date } = body;
    
    if (!weight || Number(weight) <= 0) {
      return NextResponse.json({ error: "Weight is required" }, { status: 400 });
    }
    
    const result = await pool.query(
      `INSERT INTO weight_logs (user_id, weight, date, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, weight, date, created_at`,
      [userId, Number(weight), date || new Date().toISOString().split('T')[0]]
    );
    
    return NextResponse.json({ 
      success: true, 
      weight: result.rows[0] 
    });
  } catch (error) {
    console.error("Error creating weight:", error);
    return NextResponse.json({ error: "Failed to create weight" }, { status: 500 });
  }
}
