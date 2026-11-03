// ブラウザの localStorage に保存する。プライベートブラウズ等で使えない場合もあるため、
// 失敗してもアプリが止まらないようにしている。
import type { AppState } from './types';

const KEY = 'pc-lending-system:v1';

export const SAMPLE: AppState = {
  devices: [
    { id: 'd1', assetTag: 'PC-0001', name: '貸出PC-01', model: 'ThinkPad E14', status: 'available' },
    { id: 'd2', assetTag: 'PC-0002', name: '貸出PC-02', model: 'ThinkPad E14', status: 'lent' },
    { id: 'd3', assetTag: 'PC-0003', name: '貸出PC-03', model: 'Chromebook', status: 'maintenance' },
  ],
  loans: [
    {
      id: 'l1',
      deviceId: 'd2',
      borrower: '山田 太郎',
      department: '経理部',
      lentAt: '2026-10-20',
      dueDate: '2026-10-31',
    },
  ],
};

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // 読み込めない場合はサンプルデータで起動する
  }
  return SAMPLE;
}

export function save(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 保存できない環境では、画面上の状態だけで動作する
  }
}

export function reset(): AppState {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
  return SAMPLE;
}
