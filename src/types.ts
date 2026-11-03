export type DeviceStatus = 'available' | 'lent' | 'maintenance';

export interface Device {
  id: string;
  assetTag: string; // 資産番号
  name: string; // 表示名（例：貸出PC-01）
  model: string; // 機種
  status: DeviceStatus;
}

export interface Loan {
  id: string;
  deviceId: string;
  borrower: string;
  department: string;
  lentAt: string; // ISO日付 YYYY-MM-DD
  dueDate: string; // ISO日付 YYYY-MM-DD
  returnedAt?: string; // ISO日付 YYYY-MM-DD
}

export interface AppState {
  devices: Device[];
  loans: Loan[];
}
