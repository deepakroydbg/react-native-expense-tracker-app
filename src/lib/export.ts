import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx-js-style';

import { formatCurrency, formatTime, fullDateLabel, shortDate } from '@/lib/format';
import { runningBalances, summarize, type Transaction } from '@/lib/transactions';

/** Branded download filename, e.g. MyKhata_Book_December_2026.xlsx */
function brandedFileName(name: string, ext: string): string {
  const clean = (name || 'Book').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  return `MyKhata_Book_${clean || 'Book'}.${ext}`;
}

/** Excel sheet names can't exceed 31 chars or contain : \ / ? * [ ]. */
function safeSheetName(name: string): string {
  return (name || 'Book').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Book';
}

/** Chronological rows (oldest first) with their running balance. */
function chronologicalRows(txs: Transaction[]) {
  const balances = runningBalances(txs);
  return [...txs]
    .sort((a, b) => {
      const t = a.created_at.localeCompare(b.created_at);
      return t !== 0 ? t : a.id.localeCompare(b.id);
    })
    .map((t) => ({ tx: t, balance: balances.get(t.id) ?? 0 }));
}

async function ensureSharing(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

const HEADERS = [
  'Date',
  'Time',
  'Type',
  'Amount (₹)',
  'Payment Method',
  'Category',
  'Note',
  'Running Balance (₹)',
];

/** Generate a branded, styled .xlsx for the book and open the native share sheet. */
export async function exportBookExcel(bookName: string, txs: Transaction[]): Promise<void> {
  const rows = chronologicalRows(txs);
  const totals = summarize(txs);
  const lastCol = HEADERS.length - 1;
  const blank = Array(HEADERS.length).fill('');

  // Branded header block (rows 0-4), then column headers (row 5), then data.
  const aoa: (string | number)[][] = [
    ['MyKhata Book™', ...Array(lastCol).fill('')],
    ['Your Money, Beautifully Tracked.', ...Array(lastCol).fill('')],
    [bookName, ...Array(lastCol).fill('')],
    [`Generated on: ${shortDate(new Date())}`, ...Array(lastCol).fill('')],
    blank,
    HEADERS,
  ];
  const HEADER_ROW = 5;
  for (const { tx, balance } of rows) {
    aoa.push([
      fullDateLabel(tx.entry_date),
      formatTime(tx.created_at),
      tx.type === 'credit' ? 'Cash In' : 'Cash Out',
      Number(tx.amount),
      tx.payment_method || 'Cash',
      tx.category || 'Other',
      tx.note ?? '',
      balance,
    ]);
  }
  const totalsRowIndex = aoa.length;
  aoa.push([
    `Total In: ${formatCurrency(totals.totalIn)}    |    Total Out: ${formatCurrency(
      totals.totalOut
    )}    |    Net Balance: ${formatCurrency(totals.net)}`,
    ...Array(lastCol).fill(''),
  ]);
  const footerRowIndex = aoa.length;
  aoa.push(['© MyKhata Book™ | Your Money, Beautifully Tracked.', ...Array(lastCol).fill('')]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const setStyle = (r: number, ce: number, s: object) => {
    const ref = XLSX.utils.encode_cell({ r, c: ce });
    if (ws[ref]) ws[ref].s = s;
  };
  const center = { horizontal: 'center', vertical: 'center' } as const;

  setStyle(0, 0, { font: { bold: true, sz: 18, color: { rgb: '1E3A5F' } }, fill: { fgColor: { rgb: 'F5F0E8' } }, alignment: center });
  setStyle(1, 0, { font: { italic: true, sz: 11, color: { rgb: '64748B' } }, alignment: center });
  setStyle(2, 0, { font: { bold: true, sz: 14, color: { rgb: '1E293B' } }, alignment: center });
  setStyle(3, 0, { font: { sz: 10, color: { rgb: '94A3B8' } }, alignment: center });

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: center,
  };
  for (let col = 0; col < HEADERS.length; col++) setStyle(HEADER_ROW, col, headerStyle);

  setStyle(totalsRowIndex, 0, { font: { bold: true, sz: 11, color: { rgb: '111827' } }, alignment: center });
  setStyle(footerRowIndex, 0, {
    font: { italic: true, sz: 10, color: { rgb: '94A3B8' } },
    alignment: center,
    border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } } },
  });

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
    { s: { r: totalsRowIndex, c: 0 }, e: { r: totalsRowIndex, c: lastCol } },
    { s: { r: footerRowIndex, c: 0 }, e: { r: footerRowIndex, c: lastCol } },
  ];
  ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 20 }, { hpt: 14 }];
  ws['!cols'] = [
    { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 26 }, { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(bookName));
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const uri = `${FileSystem.documentDirectory}${brandedFileName(bookName, 'xlsx')}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (!(await ensureSharing())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Share MyKhata Book Report',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
}

function buildHTML(bookName: string, txs: Transaction[]): string {
  const totals = summarize(txs);
  const rows = chronologicalRows(txs)
    .map(({ tx, balance }) => {
      const isIn = tx.type === 'credit';
      const color = isIn ? '#16a34a' : '#dc2626';
      return `<tr>
        <td>${fullDateLabel(tx.entry_date)}</td>
        <td>${formatTime(tx.created_at)}</td>
        <td style="color:${color};font-weight:600">${isIn ? 'Cash In' : 'Cash Out'}</td>
        <td style="text-align:right;color:${color};font-weight:600">${formatCurrency(Number(tx.amount))}</td>
        <td>${tx.payment_method || 'Cash'}</td>
        <td>${tx.category || 'Other'}</td>
        <td>${(tx.note ?? '').replace(/</g, '&lt;')}</td>
        <td style="text-align:right">${formatCurrency(balance)}</td>
      </tr>`;
    })
    .join('');

  return `<html><head><meta charset="utf-8" />
    <style>
      @page { margin: 24px; }
      body { font-family: -apple-system, Roboto, sans-serif; color: #111; }
      .brand { font-size: 22px; font-weight: 800; color: #2563eb; margin: 0; }
      .tagline { font-size: 12px; color: #6b7280; font-style: italic; margin: 2px 0 10px; }
      .rule { height: 3px; background: #2563eb; border: none; border-radius: 2px; margin: 0 0 14px; }
      h2 { font-size: 18px; margin: 0 0 2px; }
      .gen { font-size: 11px; color: #6b7280; margin: 0 0 14px; }
      .totals { font-size: 12px; margin: 0 0 12px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
      th { background: #f3f4f6; }
      .footer { margin-top: 18px; text-align: center; font-size: 10px; color: #9ca3af; }
    </style></head>
    <body>
      <p class="brand">MyKhata Book&trade;</p>
      <p class="tagline">Your Money, Beautifully Tracked.</p>
      <hr class="rule" />
      <h2>${bookName.replace(/</g, '&lt;')}</h2>
      <p class="gen">Generated on: ${new Date().toLocaleString('en-IN')}</p>
      <p class="totals">
        Total In: ${formatCurrency(totals.totalIn)} &nbsp;|&nbsp;
        Total Out: ${formatCurrency(totals.totalOut)} &nbsp;|&nbsp;
        Net Balance: ${formatCurrency(totals.net)}
      </p>
      <table>
        <thead><tr>
          <th>Date</th><th>Time</th><th>Type</th><th style="text-align:right">Amount</th>
          <th>Payment</th><th>Category</th><th>Note</th><th style="text-align:right">Balance</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8">No entries</td></tr>'}</tbody>
      </table>
      <p class="footer">&copy; MyKhata Book&trade; | Confidential</p>
    </body></html>`;
}

/** Generate a branded PDF for the book and open the native share sheet. */
export async function exportBookPDF(bookName: string, txs: Transaction[]): Promise<void> {
  const html = buildHTML(bookName, txs);
  const { uri } = await Print.printToFileAsync({ html });

  // Copy to a branded filename so the share sheet shows a meaningful name.
  const dest = `${FileSystem.documentDirectory}${brandedFileName(bookName, 'pdf')}`;
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
  } catch {
    // If the copy fails for any reason, fall back to the original temp file.
  }
  const shareUri = (await FileSystem.getInfoAsync(dest)).exists ? dest : uri;

  if (!(await ensureSharing())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share MyKhata Book Report',
    UTI: 'com.adobe.pdf',
  });
}
