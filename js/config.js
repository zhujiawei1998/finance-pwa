// Supabase 配置 — 在 Supabase 创建项目后替换以下值
const SUPABASE_URL = 'https://mzvtgeuyefilfctfwslm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dnRnZXV5ZWZpbGZjdGZ3c2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTM1NDUsImV4cCI6MjA5MzcyOTU0NX0.7UTR0O8jRJLzibMQlb7qaNnIymx8nnN_5hamUOXBNoQ';

// 应用常量
const APP_NAME = '个人记账';

const EXPENSE_TYPES = [
  { value: 'consumption', label: '消费', icon: '🛒' },
  { value: 'waste',      label: '浪费', icon: '🗑️' },
  { value: 'investment', label: '投资', icon: '📈' }
];

const EXPENSE_CATEGORIES = [
  { value: '饮食', icon: '🍽️' },
  { value: '住宿', icon: '🏠' },
  { value: '医药', icon: '💊' },
  { value: '交通', icon: '🚗' },
  { value: '购物', icon: '🛍️' },
  { value: '娱乐', icon: '🎮' },
  { value: '教育', icon: '📚' },
  { value: '其他', icon: '📦' }
];

const INCOME_CATEGORIES = [
  { value: '工资', icon: '💰' },
  { value: '投资', icon: '📈' },
  { value: '退款', icon: '↩️' },
  { value: '兼职', icon: '💼' },
  { value: '其他', icon: '📦' }
];

const BUDGET_CATEGORIES = ['饮食', '住宿', '医药', '交通', '购物', '娱乐', '教育', '其他'];
