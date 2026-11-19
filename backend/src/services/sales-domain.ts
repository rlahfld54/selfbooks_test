export const vatTypes = [
  ['11','과세','taxable'], ['12','영세','zero'], ['13','면세','exempt'], ['14','건별','taxable'],
  ['15','간이','other'], ['16','수출','zero'], ['17','카과','taxable'], ['18','카면','exempt'],
  ['19','카영','zero'], ['20','면건','exempt'], ['21','전자','other'], ['22','현과','taxable'],
  ['23','현면','exempt'], ['24','현영','zero'], ['51','과세','taxable'], ['52','영세','zero'],
  ['53','면세','exempt'], ['54','불공','taxable'], ['55','수입','other'], ['56','금전','other'],
  ['57','카과','taxable'], ['58','카면','exempt'], ['59','카영','zero'], ['60','면건','exempt'],
  ['61','현과','taxable'], ['62','현면','exempt'],
].map(([code, name, taxCategory]) => ({
  code: code!, name: name!, direction: Number(code) < 50 ? 'sales' : 'purchase',
  taxCategory: taxCategory!, evidenceType: 'manual', defaultTaxRate: taxCategory === 'taxable' ? '0.1' : '0',
  requiresVendor: true, requiresCardCompany: ['17','18','19','57','58','59'].includes(code!),
  allowsInputTaxCredit: ['51','52','57','59','61'].includes(code!), enabled: taxCategory !== 'other',
}));

export interface SummaryRow { type: string; partnerId: string; partner: string; supply: string; vat: string; electronic?: boolean }
export function summarizeSales(rows: SummaryRow[]) {
  const groups = new Map<string, { type: string; partnerId: string; partner: string; electronic: boolean; count: number; supply: string; vat: string }>();
  for (const row of rows) {
    const key = JSON.stringify([row.type, row.partnerId, !!row.electronic]);
    const group = groups.get(key) ?? { type: row.type, partnerId: row.partnerId, partner: row.partner, electronic: !!row.electronic, count: 0, supply: '0', vat: '0' };
    group.count++; group.supply = (BigInt(group.supply) + BigInt(row.supply)).toString();
    group.vat = (BigInt(group.vat) + BigInt(row.vat)).toString(); groups.set(key, group);
  }
  return [...groups.values()];
}
