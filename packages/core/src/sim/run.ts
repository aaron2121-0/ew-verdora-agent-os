import { formatPct, formatRM } from '../money';
import { runSimulation } from './simulate';

const seedArg = process.argv.find((a) => a.startsWith('--seed='));
const result = runSimulation({ seed: seedArg ? Number(seedArg.split('=')[1]) : undefined });

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const t = result.totals;
  console.log(`EW VERDORA Agent OS — 10-Agent stress demo (seed ${result.seed}, rules ${result.ruleVersion})`);
  console.log(`Profit Guard mode: ${result.mode} (30-day net margin ${formatPct(result.netMarginBps)})\n`);
  console.table(
    result.agents.map((a) => ({
      agent: a.code,
      behaviour: a.behaviour,
      conv: a.conversations,
      qual: a.qualified,
      quotes: a.quotes,
      orders: a.orders,
      commission: formatRM(a.commissionSen),
      score: a.score,
      tier: a.tierBefore === a.tierAfter ? a.tierAfter : `${a.tierBefore}→${a.tierAfter}`,
      diagnosis: a.diagnosis,
      enforcement: a.enforcement.join(',') || '-',
      status: a.status,
    })),
  );
  console.log(`Enquiries ${t.enquiries} · conversations ${t.conversations} · qualified ${t.qualified} · quotes ${t.quotes} (${t.quotesBlockedByProfitGuard} repriced by Profit Guard) · orders ${t.orders}`);
  console.log(`Flower revenue ${formatRM(t.flowerRevenueSen)} · commission ${formatRM(t.commissionSen)} · bonus pending ${formatRM(t.bonusPendingSen)} · duplicate events ignored ${t.duplicateEventsIgnored}`);
  const owner = result.situations.filter((s) => s.handledBy === 'OWNER').length;
  console.log(`\nSituations: ${result.situations.length} total, ${result.situations.length - owner} handled by the system, ${owner} sent to the Owner`);
  console.log(`Agents handled fully automatically: ${result.agentsHandledAutomatically}/${result.agents.length}`);
  for (const e of result.exceptions) {
    console.log(`\nOWNER EXCEPTION — Agent ${e.agentCode}\n  Risk: ${e.risk}\n  Affected orders: ${e.affectedOrders}\n  Evidence: ${e.evidence.join(' | ')}\n  Recommended action: ${e.recommendedAction}`);
  }
}
