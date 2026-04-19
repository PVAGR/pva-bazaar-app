import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createLocalDeal, listLocalDeals } from '../lib/localDealStore';

function buildPublicLink(publicId) {
  return `${globalThis.location?.origin || ''}${globalThis.location?.pathname || '/'}#/deal-local/${encodeURIComponent(publicId)}`;
}

function buildInviteLink(inviteToken) {
  return `${globalThis.location?.origin || ''}${globalThis.location?.pathname || '/'}#/deals-local/join?token=${encodeURIComponent(inviteToken)}`;
}

export default function DealsLocalPage() {
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    totalAmount: '',
    currency: 'USD',
    counterpartyName: '',
    counterpartyCountry: '',
  });
  const [created, setCreated] = useState(null);
  const [tick, setTick] = useState(0);

  const deals = useMemo(() => listLocalDeals(), [tick]);

  function onField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function onCreate(event) {
    event.preventDefault();
    const item = createLocalDeal(draft);
    setCreated(item);
    setTick((v) => v + 1);
    setDraft((prev) => ({
      ...prev,
      title: '',
      description: '',
      totalAmount: '',
      counterpartyName: '',
      counterpartyCountry: '',
    }));
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">No Render Mode</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">Local Deals (Browser Only)</h1>
        <p className="text-sm text-zinc-400 max-w-3xl">
          This flow does not use Render, backend API, or deployment hooks. Data is stored only in this browser.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Create local deal</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <input className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" value={draft.title} onChange={(e) => onField('title', e.target.value)} placeholder="Title" required />
          <input className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" value={draft.counterpartyName} onChange={(e) => onField('counterpartyName', e.target.value)} placeholder="Counterparty name" />
          <textarea className="md:col-span-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" value={draft.description} onChange={(e) => onField('description', e.target.value)} placeholder="Description" rows={3} />
          <input className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" type="number" min="0" step="0.01" value={draft.totalAmount} onChange={(e) => onField('totalAmount', e.target.value)} placeholder="Amount" />
          <input className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" value={draft.currency} onChange={(e) => onField('currency', e.target.value)} placeholder="Currency" />
          <input className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" value={draft.counterpartyCountry} onChange={(e) => onField('counterpartyCountry', e.target.value)} placeholder="Counterparty country" />
          <div className="md:col-span-2 flex gap-2">
            <button className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200" type="submit">Create local deal</button>
            <Link className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-sm text-zinc-200" to="/deals">Back to API deals</Link>
          </div>
        </form>
      </section>

      {created ? (
        <section className="rounded-lg border border-emerald-700/60 bg-emerald-950/20 p-4 text-sm text-emerald-100 space-y-2">
          <div>Created: {created.title}</div>
          <div>Public link: <a className="underline" href={buildPublicLink(created.publicId)}>{buildPublicLink(created.publicId)}</a></div>
          <div>Invite link: <a className="underline" href={buildInviteLink(created.inviteToken)}>{buildInviteLink(created.inviteToken)}</a></div>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Local deals in this browser</h2>
        <div className="space-y-2">
          {deals.length ? deals.map((deal) => (
            <div key={deal._id} className="rounded-lg border border-zinc-800 bg-black/20 p-3 text-sm text-zinc-200">
              <div className="font-medium">{deal.title}</div>
              <div className="text-zinc-400">{deal.totalAmount} {deal.currency} · {deal.counterparty?.name || 'No counterparty'}</div>
              <div className="mt-2 flex gap-2">
                <Link className="rounded border border-zinc-600 px-2 py-1 text-xs" to={`/deal-local/${encodeURIComponent(deal.publicId)}`}>Open</Link>
                <a className="rounded border border-zinc-600 px-2 py-1 text-xs" href={buildInviteLink(deal.inviteToken)}>Invite link</a>
              </div>
            </div>
          )) : <div className="text-sm text-zinc-500">No local deals yet.</div>}
        </div>
      </section>
    </section>
  );
}
