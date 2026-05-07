// Supabase 客户端
let supabase;
function initSupabase() {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(
      'https://mzvtgeuyefilfctfwslm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dnRnZXV5ZWZpbGZjdGZ3c2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTM1NDUsImV4cCI6MjA5MzcyOTU0NX0.7UTR0O8jRJLzibMQlb7qaNnIymx8nnN_5hamUOXBNoQ'
    );
  }
}
