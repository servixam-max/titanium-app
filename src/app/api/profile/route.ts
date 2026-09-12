import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { withAuth } from "@/lib/server/withAuth";
import { z } from "zod";

const profileSchema = z.object({
  goal: z.string().optional(),
  level: z.string().optional(),
  daysPerWeek: z.number().optional(),
  equipment: z.array(z.string()).optional(),
  birthDate: z.string().optional(),
  heightCm: z.number().optional(),
  weightGoal: z.number().optional(),
  restrictions: z.array(z.string()).optional(),
  onboardingComplete: z.boolean().optional(),
  preferences: z.any().optional(),
  avatarColor: z.string().optional(),
});

export const PUT = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const p = parsed.data;
    await pool.query(
      `INSERT INTO profiles (user_id, goal, level, days_per_week, equipment, birth_date, height_cm, weight_goal, restrictions, onboarding_complete, preferences, avatar_color, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         goal = COALESCE(EXCLUDED.goal, profiles.goal),
         level = COALESCE(EXCLUDED.level, profiles.level),
         days_per_week = COALESCE(EXCLUDED.days_per_week, profiles.days_per_week),
         equipment = COALESCE(EXCLUDED.equipment, profiles.equipment),
         birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
         height_cm = COALESCE(EXCLUDED.height_cm, profiles.height_cm),
         weight_goal = COALESCE(EXCLUDED.weight_goal, profiles.weight_goal),
         restrictions = COALESCE(EXCLUDED.restrictions, profiles.restrictions),
         onboarding_complete = COALESCE(EXCLUDED.onboarding_complete, profiles.onboarding_complete),
         preferences = COALESCE(EXCLUDED.preferences, profiles.preferences),
         avatar_color = COALESCE(EXCLUDED.avatar_color, profiles.avatar_color),
         updated_at = NOW()`,
      [
        userId,
        p.goal || null,
        p.level || null,
        p.daysPerWeek || null,
        p.equipment || null,
        p.birthDate || null,
        p.heightCm || null,
        p.weightGoal || null,
        p.restrictions || null,
        p.onboardingComplete ?? null,
        p.preferences ? JSON.stringify(p.preferences) : null,
        p.avatarColor || null,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return NextResponse.json({ error: "Error al guardar perfil" }, { status: 500 });
  }
});
