import { useEffect, useMemo, useState } from 'react';
import type { AppState, Device } from './types';
import {
  LendingError,
  activeLoan,
  addDevice,
  isOverdue,
  lend,
  loansToCsv,
  returnDevice,
  setMaintenance,
} from './lending';
import { load, reset, save } from './storage';

type Tab = 'status' | 'devices' | 'history';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const STATUS_LABEL: Record<Device['status'], string> = {
  available: '貸出可',
  lent: '貸出中',
  maintenance: '保守中',
};

export default function App() {
  const [state, setState] = useState<AppState>(load);
  const [tab, setTab] = useState<Tab>('status');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [lendingId, setLendingId] = useState<string | null>(null);

  useEffect(() => save(state), [state]);

  // 業務ロジックの例外を画面のメッセージに変換する
  const run = (fn: () => AppState, ok: string) => {
    try {
      setState(fn());
      setMessage({ kind: 'ok', text: ok });
      return true;
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof LendingError ? e.message : '予期しないエラーです' });
      return false;
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.devices;
    return state.devices.filter((d) => {
      const loan = activeLoan(state, d.id);
      return [d.assetTag, d.name, d.model, loan?.borrower ?? '', loan?.department ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [state, query]);

  const counts = {
    available: state.devices.filter((d) => d.status === 'available').length,
    lent: state.devices.filter((d) => d.status === 'lent').length,
    overdue: state.loans.filter((l) => isOverdue(l, today())).length,
  };

  const downloadCsv = () => {
    const blob = new Blob(['﻿' + loansToCsv(state)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lending-history-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app">
      <header>
        <h1>PC貸し出し管理</h1>
        <div className="summary">
          <span>貸出可 <b>{counts.available}</b></span>
          <span>貸出中 <b>{counts.lent}</b></span>
          <span className={counts.overdue ? 'warn' : ''}>延滞 <b>{counts.overdue}</b></span>
        </div>
      </header>

      <nav>
        {(['status', 'devices', 'history'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {{ status: '貸出状況', devices: '機器登録', history: '履歴' }[t]}
          </button>
        ))}
      </nav>

      {message && (
        <p className={`message ${message.kind}`} role="status">
          {message.text}
        </p>
      )}

      {tab === 'status' && (
        <section>
          <input
            className="search"
            placeholder="資産番号・名前・借用者で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="devices">
            {filtered.map((d) => {
              const loan = activeLoan(state, d.id);
              const overdue = loan && isOverdue(loan, today());
              return (
                <li key={d.id} className={overdue ? 'overdue' : ''}>
                  <div className="row">
                    <div>
                      <b>{d.name}</b> <small>{d.assetTag} / {d.model}</small>
                    </div>
                    <span className={`badge ${d.status}`}>{overdue ? '延滞' : STATUS_LABEL[d.status]}</span>
                  </div>
                  {loan && (
                    <p className="loan">
                      {loan.borrower}{loan.department && `（${loan.department}）`} {loan.lentAt} → 返却予定 {loan.dueDate}
                    </p>
                  )}
                  <div className="actions">
                    {d.status === 'available' && (
                      <button onClick={() => setLendingId(lendingId === d.id ? null : d.id)}>貸し出す</button>
                    )}
                    {d.status === 'lent' && (
                      <button onClick={() => run(() => returnDevice(state, d.id, today()), `${d.name} を返却しました`)}>
                        返却する
                      </button>
                    )}
                    {d.status !== 'lent' && (
                      <button
                        className="ghost"
                        onClick={() =>
                          run(
                            () => setMaintenance(state, d.id, d.status !== 'maintenance'),
                            d.status === 'maintenance' ? '保守を解除しました' : '保守中にしました',
                          )
                        }
                      >
                        {d.status === 'maintenance' ? '保守解除' : '保守中にする'}
                      </button>
                    )}
                  </div>
                  {lendingId === d.id && (
                    <LendForm
                      onSubmit={(v) => {
                        if (run(() => lend(state, { deviceId: d.id, ...v }), `${d.name} を貸し出しました`)) {
                          setLendingId(null);
                        }
                      }}
                    />
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && <li className="empty">該当する機器がありません</li>}
          </ul>
        </section>
      )}

      {tab === 'devices' && (
        <section>
          <DeviceForm onSubmit={(v) => run(() => addDevice(state, v), `${v.name} を登録しました`)} />
          <button
            className="ghost"
            onClick={() => {
              if (confirm('保存データを消してサンプルデータに戻しますか？')) {
                setState(reset());
                setMessage({ kind: 'ok', text: 'サンプルデータに戻しました' });
              }
            }}
          >
            サンプルデータに戻す
          </button>
        </section>
      )}

      {tab === 'history' && (
        <section>
          <button onClick={downloadCsv}>CSVでダウンロード</button>
          <table>
            <thead>
              <tr>
                <th>機器</th>
                <th>借用者</th>
                <th>貸出日</th>
                <th>返却予定</th>
                <th>返却日</th>
              </tr>
            </thead>
            <tbody>
              {[...state.loans].reverse().map((l) => (
                <tr key={l.id} className={isOverdue(l, today()) ? 'overdue' : ''}>
                  <td>{state.devices.find((d) => d.id === l.deviceId)?.name ?? '(削除済み)'}</td>
                  <td>{l.borrower}</td>
                  <td>{l.lentAt}</td>
                  <td>{l.dueDate}</td>
                  <td>{l.returnedAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer>データはこのブラウザ内にのみ保存されます（デモ用）。</footer>
    </div>
  );
}

function LendForm({
  onSubmit,
}: {
  onSubmit: (v: { borrower: string; department: string; lentAt: string; dueDate: string }) => void;
}) {
  const [v, setV] = useState({ borrower: '', department: '', lentAt: today(), dueDate: plusDays(7) });
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <label>借用者<input value={v.borrower} onChange={(e) => setV({ ...v, borrower: e.target.value })} required /></label>
      <label>部署<input value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} /></label>
      <label>貸出日<input type="date" value={v.lentAt} onChange={(e) => setV({ ...v, lentAt: e.target.value })} /></label>
      <label>返却予定日<input type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></label>
      <button type="submit">確定</button>
    </form>
  );
}

function DeviceForm({ onSubmit }: { onSubmit: (v: { assetTag: string; name: string; model: string }) => void }) {
  const empty = { assetTag: '', name: '', model: '' };
  const [v, setV] = useState(empty);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
        setV(empty);
      }}
    >
      <label>資産番号<input value={v.assetTag} onChange={(e) => setV({ ...v, assetTag: e.target.value })} required /></label>
      <label>名前<input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></label>
      <label>機種<input value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} /></label>
      <button type="submit">登録</button>
    </form>
  );
}
