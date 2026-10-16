// Export Utilities for CSV and Print Sheets

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function printStatement(title, contentHtml) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Ocean Enterprises</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0369a1; }
          .subtitle { font-size: 14px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .total { font-weight: bold; font-size: 16px; text-align: right; margin-top: 20px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">🌊 Ocean Enterprises</div>
            <div class="subtitle">Packaged Drinking Water & Beverage Express Distribution</div>
          </div>
          <div style="text-align: right; font-size: 13px; color: #64748b;">
            <div>Date: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div>Phone: +91 98765 43210</div>
          </div>
        </div>
        <h2>${title}</h2>
        ${contentHtml}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
