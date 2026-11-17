import {
  claimNovaPayMonitorDispatch,
  connectOrderStore
} from '../lib/order-store.js';
import { runNovaPayMonitor } from './novapay-monitor.js';
import { isNovaPayMonitorDispatchAuthorized } from '../lib/novapay-monitor-dispatch.js';

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

export function createNovaPayMonitorBackgroundHandler({
  authorize = isNovaPayMonitorDispatchAuthorized,
  connectStore = connectOrderStore,
  claimDispatch = claimNovaPayMonitorDispatch,
  runMonitor = runNovaPayMonitor
} = {}) {
  return async (event) => {
    if (event.httpMethod !== 'POST' || !authorize(event.headers)) {
      console.warn('NovaPay monitor background rejected an unauthorized dispatch');
      // Finish successfully so an unauthenticated request is never retried by
      // Netlify as a background failure.
      return response(200, { ok: false, skipped: 'unauthorized_dispatch' });
    }
    const dispatchId = String(
      Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === 'x-miva-novapay-dispatch-id')?.[1] || ''
    ).trim();
    connectStore(event);
    if (!await claimDispatch(dispatchId)) {
      console.info('NovaPay monitor background skipped a duplicate or overlapping dispatch');
      return response(200, { ok: false, skipped: 'duplicate_or_in_progress' });
    }
    return runMonitor(event);
  };
}

// The -background filename makes this a Netlify Background Function. The
// scheduled dispatcher receives 202 quickly while this worker can wait for a
// 120-second NovaPay authentication without the 30-second schedule limit.
export const handler = createNovaPayMonitorBackgroundHandler();
