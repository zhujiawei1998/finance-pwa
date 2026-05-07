// Supabase 客户端初始化
let supabase;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase JS SDK 未加载，请检查 CDN 脚本');
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
