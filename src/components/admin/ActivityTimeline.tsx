'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Search, BookOpen, LogIn, MessageSquare, Clock } from 'lucide-react';
import { ActivityLog } from '../../lib/models/activity';

const actionIcons = {
  login: <LogIn className="w-4 h-4 text-blue-500" />,
  search: <Search className="w-4 h-4 text-purple-500" />,
  answer_view: <BookOpen className="w-4 h-4 text-green-500" />,
  review_submission: <MessageSquare className="w-4 h-4 text-amber-500" />,
};

export function ActivityTimeline({ logs }: { logs: ActivityLog[] }) {
  if (!logs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <Clock className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">No activity recorded for this user.</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {logs.map((log, idx) => (
          <li key={log.id || idx}>
            <div className="relative pb-8">
              {idx !== logs.length - 1 && (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center ring-8 ring-white">
                    {actionIcons[log.action as keyof typeof actionIcons] || <Clock className="w-4 h-4" />}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-800 font-medium">
                      {log.action.replace('_', ' ')} <span className="font-normal text-slate-500">
                        {log.metadata?.query ? `"${log.metadata.query}"` : ''}
                      </span>
                    </p>
                    {log.metadata?.source && (
                      <p className="mt-1 text-xs text-slate-400 italic">
                        Source: {log.metadata.source}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-slate-500">
                    <time dateTime={log.timestamp.toString()}>
                      {format(new Date(log.timestamp), 'h:mm a, MMM dd')}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
