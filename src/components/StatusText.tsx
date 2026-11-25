import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

export function StatusText({ status }: { status: string }) {
  switch (status) {
    case 'Active':
    case 'Paid':
    case 'Resolved':
    case 'Renewed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {status}
        </span>
      );
    case 'Pending':
    case 'Unpaid':
    case 'Partial':
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          {status === 'In Progress' ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          {status}
        </span>
      );
    case 'Overdue':
    case 'Suspended':
    case 'Open':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          {status}
        </span>
      );
    case 'Inactive':
    case 'Expired':
    case 'Cancelled':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {status}
        </span>
      );
  }
}
