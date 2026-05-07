// 图表模块
const Charts = {
  doughnutInstance: null,
  barInstance: null,
  lineInstance: null,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  _initialized: false,

  init() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth();
    this.updateLabel();
    this.render();

    if (!this._initialized) {
      this._initialized = true;
      document.getElementById('chart-month-prev').addEventListener('click', () => this.prevMonth());
      document.getElementById('chart-month-next').addEventListener('click', () => this.nextMonth());
    }
  },

  updateLabel() {
    document.getElementById('chart-month-label').textContent =
      `${this.currentYear}年${this.currentMonth + 1}月`;
  },

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.updateLabel();
    this.render();
  },

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    this.updateLabel();
    this.render();
  },

  async render() {
    const [categoryData, trendData] = await Promise.all([
      Stats.getMonthExpenseByCategory(this.currentYear, this.currentMonth),
      Stats.getMonthlyTrend(6)
    ]);
    this.renderDoughnut(categoryData);
    this.renderBar(trendData);
    this.renderSavingsLine(trendData);
  },

  renderDoughnut(data) {
    const ctx = document.getElementById('category-doughnut');
    if (!ctx) return;
    if (this.doughnutInstance) this.doughnutInstance.destroy();

    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

    if (data.length === 0) {
      this.doughnutInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['暂无数据'], datasets: [{ data: [1], backgroundColor: ['#E5E7EB'] }] },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } } }
        }
      });
      return;
    }

    // 按金额降序排列，小于 5% 合并为"其他"
    const sorted = data.sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((s, d) => s + d.amount, 0);
    const threshold = total * 0.05;
    const main = sorted.filter(d => d.amount >= threshold);
    const other = sorted.filter(d => d.amount < threshold);
    if (other.length > 0) {
      main.push({ category: '其他', amount: other.reduce((s, d) => s + d.amount, 0) });
    }

    this.doughnutInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: main.map(d => d.category),
        datasets: [{
          data: main.map(d => d.amount),
          backgroundColor: main.map((_, i) => colors[i % colors.length])
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ¥${ctx.raw.toFixed(2)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  renderBar(data) {
    const ctx = document.getElementById('monthly-bar');
    if (!ctx) return;
    if (this.barInstance) this.barInstance.destroy();

    this.barInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          { label: '支出', data: data.map(d => d.expense), backgroundColor: '#EF4444', borderRadius: 4 },
          { label: '收入', data: data.map(d => d.income), backgroundColor: '#10B981', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '¥' + v } }
        }
      }
    });
  },

  renderSavingsLine(data) {
    const ctx = document.getElementById('savings-line');
    if (!ctx) return;
    if (this.lineInstance) this.lineInstance.destroy();

    // 计算累计储蓄
    const cumulative = [];
    let running = 0;
    data.forEach(d => {
      running += d.savings;
      cumulative.push(running);
    });

    this.lineInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: '累计储蓄',
          data: cumulative,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#3B82F6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => '¥' + v } }
        }
      }
    });
  }
};

function initCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js 未加载');
    return;
  }
  Charts.init();
}
