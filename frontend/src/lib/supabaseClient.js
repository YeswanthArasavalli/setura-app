import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://txqpybrpkkftypvfflpv.supabase.co"
const supabaseAnonKey = "sb_publishable_HzE1PX13183jDjDrWXHpKA_7UQotM6J"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)