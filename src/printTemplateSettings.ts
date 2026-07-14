export type PrintTemplateCode =
  | 'payment_request'
  | 'payment_detail'
  | 'vat_statement'
  | 'qc_report'
  | 'cash_payment'
  | 'debt_reconciliation'
  | 'generic_report';

export type PrintTemplateSettings = {
  code: PrintTemplateCode;
  name: string;
  fontFamily: string;
  fontSize: number;
  titleFontSize: number;
  paperSize: 'A4' | 'A5';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  showLogo: boolean;
  logoDataUrl: string;
  companyName: string;
  titleText: string;
  signerTitle: string;
  signerName: string;
  secondarySignerTitle: string;
  secondarySignerName: string;
  showDate: boolean;
};

export const PRINT_TEMPLATE_STORAGE_KEY = 'nfc_print_template_settings_v2';

export const PRINT_TEMPLATE_CATALOG: Array<{ code: PrintTemplateCode; name: string; description: string }> = [
  { code: 'payment_request', name: 'Giấy đề nghị thanh toán', description: 'Phiếu đề nghị thanh toán A5/A4' },
  { code: 'payment_detail', name: 'Bảng chi tiết thanh toán', description: 'Bảng thanh toán gỗ theo biên bản QC' },
  { code: 'vat_statement', name: 'Bảng kê hóa đơn VAT', description: 'Bảng kê đối chiếu hóa đơn VAT' },
  { code: 'qc_report', name: 'Biên bản QC', description: 'Biên bản nghiệm thu và kiểm hàng' },
  { code: 'cash_payment', name: 'Phiếu chi', description: 'Chứng từ chi tiền' },
  { code: 'debt_reconciliation', name: 'Đối chiếu công nợ', description: 'Bảng xác nhận và đối chiếu công nợ' },
  { code: 'generic_report', name: 'Biểu mẫu khác', description: 'Cấu hình mặc định cho các báo cáo còn lại' },
];

const base = (code: PrintTemplateCode, name: string): PrintTemplateSettings => ({
  code,
  name,
  fontFamily: 'Times New Roman',
  fontSize: 13,
  titleFontSize: 17,
  paperSize: 'A4',
  orientation: 'portrait',
  marginTop: 8,
  marginRight: 8,
  marginBottom: 8,
  marginLeft: 8,
  showLogo: false,
  logoDataUrl: '',
  companyName: 'CÔNG TY CỔ PHẦN NAFOCO',
  titleText: name.toUpperCase(),
  signerTitle: 'Tổng Giám Đốc',
  signerName: '',
  secondarySignerTitle: 'Kế toán trưởng',
  secondarySignerName: '',
  showDate: true,
});

export const DEFAULT_PRINT_TEMPLATES: Record<PrintTemplateCode, PrintTemplateSettings> = {
  payment_request: { ...base('payment_request', 'Giấy đề nghị thanh toán'), paperSize: 'A5', orientation: 'landscape', fontSize: 14, titleFontSize: 18 },
  payment_detail: { ...base('payment_detail', 'Bảng chi tiết thanh toán gỗ'), fontSize: 13, titleFontSize: 17 },
  vat_statement: { ...base('vat_statement', 'Bảng kê chi tiết lâm sản hạch toán đối chiếu hóa đơn VAT'), fontSize: 12, titleFontSize: 16 },
  qc_report: { ...base('qc_report', 'Biên bản nghiệm thu gỗ keo xẻ thô'), fontSize: 12, titleFontSize: 16 },
  cash_payment: { ...base('cash_payment', 'Phiếu chi'), paperSize: 'A5', orientation: 'landscape' },
  debt_reconciliation: base('debt_reconciliation', 'Bảng đối chiếu công nợ'),
  generic_report: base('generic_report', 'Báo cáo'),
};

export function loadPrintTemplates(): Record<PrintTemplateCode, PrintTemplateSettings> {
  try {
    const raw = localStorage.getItem(PRINT_TEMPLATE_STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_TEMPLATES;
    const parsed = JSON.parse(raw) as Partial<Record<PrintTemplateCode, Partial<PrintTemplateSettings>>>;
    return Object.fromEntries(
      Object.entries(DEFAULT_PRINT_TEMPLATES).map(([code, defaults]) => [
        code,
        { ...defaults, ...(parsed[code as PrintTemplateCode] || {}), code },
      ]),
    ) as Record<PrintTemplateCode, PrintTemplateSettings>;
  } catch {
    return DEFAULT_PRINT_TEMPLATES;
  }
}

export function getPrintTemplate(code: PrintTemplateCode): PrintTemplateSettings {
  return loadPrintTemplates()[code] || DEFAULT_PRINT_TEMPLATES.generic_report;
}

export function savePrintTemplates(settings: Record<PrintTemplateCode, PrintTemplateSettings>) {
  localStorage.setItem(PRINT_TEMPLATE_STORAGE_KEY, JSON.stringify(settings));
}

export function pageSizeMm(settings: PrintTemplateSettings) {
  const isA5 = settings.paperSize === 'A5';
  const portrait = settings.orientation === 'portrait';
  const width = isA5 ? (portrait ? 148 : 210) : (portrait ? 210 : 297);
  const height = isA5 ? (portrait ? 210 : 148) : (portrait ? 297 : 210);
  return { width, height };
}

export function buildPrintCss(settings: PrintTemplateSettings, selector = '.nfc-print-document') {
  const { width, height } = pageSizeMm(settings);
  return `
    @page { size: ${settings.paperSize} ${settings.orientation}; margin: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm; }
    ${selector} {
      box-sizing: border-box;
      width: ${Math.max(50, width - settings.marginLeft - settings.marginRight)}mm !important;
      min-height: ${Math.max(50, height - settings.marginTop - settings.marginBottom)}mm !important;
      font-family: "${settings.fontFamily}", serif !important;
      font-size: ${settings.fontSize}px !important;
    }
    ${selector} .nfc-print-title { font-size: ${settings.titleFontSize}px !important; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      ${selector} { margin: 0 auto !important; box-shadow: none !important; }
    }
  `;
}
