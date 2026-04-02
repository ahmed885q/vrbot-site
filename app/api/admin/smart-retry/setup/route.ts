import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Describe current table columns
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.VRBOT_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // Try to select one row to see column names
    const { data, error } = await getDB()
      .from('learned_solutions')
      .select('*')
      .limit(1)
    if (error) return NextResponse.json({ error: error.message, code: error.code })
    const columns = data && data.length > 0 ? Object.keys(data[0]) : 'table_empty'
    return NextResponse.json({ status: 'ok', columns, sample: data?.[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Create learned_solutions table if not exists
export async function POST(req: NextRequest) {
  // Verify admin API key
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.VRBOT_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await getDB().rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS learned_solutions (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          task_name text NOT NULL,
          screen_hash text NOT NULL,
          action_name text NOT NULL,
          action_params jsonb DEFAULT '{}'::jsonb,
          success_count integer DEFAULT 0,
          fail_count integer DEFAULT 0,
          source text DEFAULT 'local',
          last_used timestamptz DEFAULT now(),
          created_at timestamptz DEFAULT now(),
          UNIQUE(task_name, screen_hash)
        );
        ALTER TABLE learned_solutions ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_learned_solutions_task ON learned_solutions(task_name);
        CREATE INDEX IF NOT EXISTS idx_learned_solutions_source ON learned_solutions(source);
      `
    })

    // If RPC doesn't exist, use raw SQL via postgrest
    if (error) {
      // Fallback: try direct table creation via insert test
      const { error: testErr } = await getDB()
        .from('learned_solutions')
        .select('id')
        .limit(1)

      if (testErr && testErr.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Table does not exist and cannot be auto-created via API. Please run the migration SQL manually.',
          migration_sql: `CREATE TABLE IF NOT EXISTS learned_solutions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name text NOT NULL,
  screen_hash text NOT NULL,
  action_name text NOT NULL,
  action_params jsonb DEFAULT '{}'::jsonb,
  success_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  source text DEFAULT 'local',
  last_used timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_name, screen_hash)
);
ALTER TABLE learned_solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full" ON learned_solutions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read" ON learned_solutions FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_learned_solutions_task ON learned_solutions(task_name);`
        }, { status: 400 })
      }

      return NextResponse.json({ status: 'table_exists', message: 'Table already exists' })
    }

    return NextResponse.json({ status: 'created', message: 'Table created successfully' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
