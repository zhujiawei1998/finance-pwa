# 个人记账 PWA

一款可在 iPhone 上安装使用的个人财务管理 PWA 应用。

## 功能

- 📝 支出记录（浪费/消费/投资 分类 + 饮食/住宿/医药等子类）
- 💰 收入记录（工资/投资/退款/兼职等）
- 📊 自动统计日/周/月收入支出，储蓄实时计算
- 📈 美观图表（支出分类环形图、收支对比柱状图、储蓄趋势折线图）
- 🎯 预算管理（分类限额、超支红色警告）
- 📢 每周日下午 2 点财务提醒（需打开 App）
- 📤 CSV 导出
- 📱 PWA 支持（可添加到 iPhone 主屏幕，离线可用）
- ☁️ 跨设备同步（Supabase）

## 快速开始

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册/登录
2. 创建新项目，记下 **Project URL** 和 **anon public key**
3. 进入 SQL Editor，执行以下 SQL 建表脚本：

```sql
-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 支出表
CREATE TABLE expenses (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  note          TEXT DEFAULT '',
  expense_type  VARCHAR(20) NOT NULL CHECK (expense_type IN ('waste','consumption','investment')),
  category      VARCHAR(20) NOT NULL CHECK (category IN ('饮食','住宿','医药','交通','购物','娱乐','教育','其他')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 收入表
CREATE TABLE income (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  note          TEXT DEFAULT '',
  category      VARCHAR(20) NOT NULL CHECK (category IN ('工资','投资','退款','兼职','其他')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 预算限制表
CREATE TABLE budget_limits (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      VARCHAR(20) NOT NULL,
  limit_amount  DECIMAL(12,2) NOT NULL CHECK (limit_amount > 0),
  period        VARCHAR(10) DEFAULT 'monthly',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- 用户偏好表
CREATE TABLE user_preferences (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_notification_date  DATE,
  weekly_reminder_enabled BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_expenses_user_date     ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_user_category ON expenses(user_id, category);
CREATE INDEX idx_income_user_date       ON income(user_id, date DESC);
CREATE INDEX idx_income_user_category   ON income(user_id, category);

-- RLS
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE income          ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_expenses"    ON expenses        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_income"      ON income          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_budget"      ON budget_limits   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- 新用户自动创建偏好
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2. 配置

编辑 `js/config.js`，替换 Supabase 密钥：

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

### 3. 部署

上传所有文件到任意静态托管服务：
- **GitHub Pages**: 推送到 `gh-pages` 分支
- **Netlify**: 拖拽文件夹即可
- **Vercel**: `vercel` 命令部署

### 4. 安装到 iPhone

1. Safari 打开你的部署地址
2. 点击底部分享按钮 → "添加到主屏幕"
3. 输入名称 → 添加
4. 主屏幕出现 App 图标，点击即可独立运行

## 技术栈

- 纯 HTML/CSS/JS（无框架）
- Supabase（认证 + 数据库）
- Chart.js（图表）
- PWA Manifest + Service Worker

## 许可

MIT
