import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const users = [
  "admin@medios.demo",
  "sofia@medios.demo",
  "maria@medios.demo",
];

for (const email of users) {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: "demo1234",
  });
  if (error) {
    console.log(`${email} -> LOGIN ERROR:`, error.message);
    continue;
  }
  const { data: profile } = await sb
    .from("profiles")
    .select("role, nombre, clinic_id")
    .eq("id", data.user.id)
    .single();
  const { count: apptsCount } = await sb
    .from("appointments")
    .select("*", { count: "exact", head: true });
  const { count: patientsCount } = await sb
    .from("patients")
    .select("*", { count: "exact", head: true });
  console.log(
    `${email.padEnd(20)} | role=${profile?.role?.padEnd(7)} | nombre=${profile?.nombre?.padEnd(22)} | appts=${apptsCount} | patients=${patientsCount}`,
  );
}
