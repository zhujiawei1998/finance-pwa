// CSV 导出模块
const ExportCSV = {
  async run() {
    const userId = Auth.currentUser?.id;
    if (!userId) return;

    Toast.show('正在导出...', '');

    // 获取所有数据
    const [{ data: expenses }, { data: incomes }] = await Promise.all([
      supabase.from('expenses').select('date, amount, expense_type, category, note').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('income').select('date, amount, category, note').eq('user_id', userId).order('date', { ascending: false })
    ]);

    const typeLabels = { waste: '浪费', consumption: '消费', investment: '投资' };
    const rows = ['﻿类型,分类,金额,日期,备注,支出类型'];

    (expenses || []).forEach(e => {
      rows.push(`支出,${e.category},${e.amount},${e.date},"${(e.note || '').replace(/"/g, '""')}",${typeLabels[e.expense_type] || e.expense_type}`);
    });
    (incomes || []).forEach(i => {
      rows.push(`收入,${i.category},${i.amount},${i.date},"${(i.note || '').replace(/"/g, '""')}",`);
    });

    const now = new Date();
    const filename = `个人记账_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.csv`;

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.show('导出成功', 'success');
  }
};
