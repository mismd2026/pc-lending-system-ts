// 貸し出しの業務ロジック。UIから切り離して単体テストできるようにしている。
import type { AppState, Device, Loan } from './types';

export class LendingError extends Error {}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function activeLoan(state: AppState, deviceId: string): Loan | undefined {
  return state.loans.find((l) => l.deviceId === deviceId && !l.returnedAt);
}

export function isOverdue(loan: Loan, today: string): boolean {
  return !loan.returnedAt && loan.dueDate < today;
}

export function addDevice(state: AppState, input: Omit<Device, 'id' | 'status'>): AppState {
  const assetTag = input.assetTag.trim();
  if (!assetTag || !input.name.trim()) throw new LendingError('資産番号と名前は必須です');
  if (state.devices.some((d) => d.assetTag === assetTag)) {
    throw new LendingError(`資産番号 ${assetTag} はすでに登録されています`);
  }
  const device: Device = { ...input, assetTag, id: newId(), status: 'available' };
  return { ...state, devices: [...state.devices, device] };
}

export function lend(
  state: AppState,
  input: { deviceId: string; borrower: string; department: string; lentAt: string; dueDate: string },
): AppState {
  const device = state.devices.find((d) => d.id === input.deviceId);
  if (!device) throw new LendingError('機器が見つかりません');
  if (device.status !== 'available') throw new LendingError(`${device.name} は貸し出しできない状態です`);
  if (!input.borrower.trim()) throw new LendingError('借用者は必須です');
  if (input.dueDate < input.lentAt) throw new LendingError('返却予定日は貸出日以降にしてください');

  const loan: Loan = { id: newId(), ...input, borrower: input.borrower.trim() };
  return {
    devices: state.devices.map((d) => (d.id === device.id ? { ...d, status: 'lent' } : d)),
    loans: [...state.loans, loan],
  };
}

export function returnDevice(state: AppState, deviceId: string, returnedAt: string): AppState {
  const loan = activeLoan(state, deviceId);
  if (!loan) throw new LendingError('貸出中の記録がありません');
  return {
    devices: state.devices.map((d) => (d.id === deviceId ? { ...d, status: 'available' } : d)),
    loans: state.loans.map((l) => (l.id === loan.id ? { ...l, returnedAt } : l)),
  };
}

export function setMaintenance(state: AppState, deviceId: string, on: boolean): AppState {
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) throw new LendingError('機器が見つかりません');
  if (device.status === 'lent') throw new LendingError('貸出中の機器は保守にできません');
  return {
    ...state,
    devices: state.devices.map((d) =>
      d.id === deviceId ? { ...d, status: on ? 'maintenance' : 'available' } : d,
    ),
  };
}

export function loansToCsv(state: AppState): string {
  const name = (id: string) => state.devices.find((d) => d.id === id)?.name ?? '(削除済み)';
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [['機器', '借用者', '部署', '貸出日', '返却予定日', '返却日']];
  for (const l of state.loans) {
    rows.push([name(l.deviceId), l.borrower, l.department, l.lentAt, l.dueDate, l.returnedAt ?? '']);
  }
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
