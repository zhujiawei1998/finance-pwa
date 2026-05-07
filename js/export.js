const ExportCSV = {
  run() {
    const exps = DB.getExpenses();
    const incs = DB.getIncomes();
    const tl = { waste: '浪费', consumption: '消费', investment: '投资' };
    const rows = ['﻿类型,分类,金额,日期,备注,支出类型'];
    exps.forEach(e => rows.push(`支出,${e.category},${e.amount},${e.date},"${(e.note||'').replace(/"/g,'""')}",${tl[e.expense_type]||e.expense_type}`));
    incs.forEach(i => rows.push(`收入,${i.category},${i.amount},${i.date},"${(i.note||'').replace(/"/g,'""')}",`));

    const now = new Date();
    const fn = `个人记账_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.csv`;
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fn;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    Toast.show('CSV 导出成功', 'success');
  }
};

// 数据同步：JSON 导出/导入
const SyncManager = {
  exportJSON() {
    const json = DB.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `记账备份_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    Toast.show('数据备份成功', 'success');
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const before = DB.getExpenses().length + DB.getIncomes().length;
        DB.importAll(text);
        const after = DB.getExpenses().length + DB.getIncomes().length;
        Toast.show(`同步完成，新增 ${after - before} 条记录`, 'success');
        refreshDashboard();
        if (typeof refreshBudget === 'function') refreshBudget();
      } catch (err) {
        Toast.show('文件格式错误', 'error');
      }
    };
    input.click();
  }
};
