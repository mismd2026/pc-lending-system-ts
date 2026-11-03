import { describe, expect, it } from 'vitest';
import { LendingError, addDevice, isOverdue, lend, loansToCsv, returnDevice, setMaintenance } from './lending';
import type { AppState } from './types';

const base = (): AppState => ({
  devices: [{ id: 'd1', assetTag: 'PC-0001', name: '貸出PC-01', model: 'X', status: 'available' }],
  loans: [],
});

const lendInput = { deviceId: 'd1', borrower: '佐藤', department: '総務', lentAt: '2026-11-01', dueDate: '2026-11-08' };

describe('貸し出し', () => {
  it('貸し出すと機器が貸出中になり、記録が増える', () => {
    const s = lend(base(), lendInput);
    expect(s.devices[0].status).toBe('lent');
    expect(s.loans).toHaveLength(1);
  });

  it('貸出中の機器は二重に貸し出せない', () => {
    const s = lend(base(), lendInput);
    expect(() => lend(s, lendInput)).toThrow(LendingError);
  });

  it('返却予定日が貸出日より前ならエラー', () => {
    expect(() => lend(base(), { ...lendInput, dueDate: '2026-10-31' })).toThrow(LendingError);
  });

  it('返却すると貸出可に戻り、返却日が記録される', () => {
    const s = returnDevice(lend(base(), lendInput), 'd1', '2026-11-05');
    expect(s.devices[0].status).toBe('available');
    expect(s.loans[0].returnedAt).toBe('2026-11-05');
  });
});

describe('延滞判定', () => {
  it('返却予定日を過ぎて未返却なら延滞', () => {
    const loan = lend(base(), lendInput).loans[0];
    expect(isOverdue(loan, '2026-11-09')).toBe(true);
    expect(isOverdue(loan, '2026-11-08')).toBe(false);
  });
});

describe('機器管理', () => {
  it('同じ資産番号は登録できない', () => {
    expect(() => addDevice(base(), { assetTag: 'PC-0001', name: '重複', model: '' })).toThrow(LendingError);
  });

  it('貸出中の機器は保守にできない', () => {
    expect(() => setMaintenance(lend(base(), lendInput), 'd1', true)).toThrow(LendingError);
  });
});

describe('CSV出力', () => {
  it('カンマや引用符を含む値をエスケープする', () => {
    const csv = loansToCsv(lend(base(), { ...lendInput, borrower: '佐藤 "Jr", 一郎' }));
    expect(csv).toContain('"佐藤 ""Jr"", 一郎"');
  });
});
