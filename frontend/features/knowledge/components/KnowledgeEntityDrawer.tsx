"use client";

import React from "react";
import {
  Calendar,
  CheckSquare,
  FileText,
  Hash,
  Loader2,
  Mail,
  User,
  X,
  Zap,
} from "lucide-react";
import { KnowledgeNode, NodeAction } from "../types";
import { useKnowledgeEntityDetails } from "../hooks";

interface Props {
  entity: KnowledgeNode | null;
  onClose: () => void;
  onAction: (action: NodeAction) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-5 w-5 text-orange-500" />,
  meeting: <Calendar className="h-5 w-5 text-purple-500" />,
  document: <FileText className="h-5 w-5 text-green-500" />,
  person: <User className="h-5 w-5 text-blue-500" />,
  user: <User className="h-5 w-5 text-blue-500" />,
  approval: <CheckSquare className="h-5 w-5 text-red-500" />,
  automation: <Zap className="h-5 w-5 text-cyan-500" />,
  topic: <Hash className="h-5 w-5 text-yellow-500" />,
};

export function KnowledgeEntityDrawer({ entity, onClose, onAction }: Props) {
  const detailsQuery = useKnowledgeEntityDetails(entity?.id);

  if (!entity) return null;

  const displayEntity = detailsQuery.data?.entity || entity;
  const relatedEntities = detailsQuery.data?.relatedEntities || [];
  const actions = detailsQuery.data?.suggestedActions?.length
    ? detailsQuery.data.suggestedActions
    : displayEntity.actions || [];

  return (
    <div className="absolute right-0 top-0 z-50 flex h-full w-96 max-w-[calc(100vw-1.5rem)] flex-col border-l border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {TYPE_ICONS[displayEntity.type]}
          <h2 className="truncate text-lg font-semibold capitalize text-white">
            {displayEntity.type} Details
          </h2>
        </div>
        <button
          onClick={onClose}
          title="Close details"
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div>
          <h3 className="break-words text-xl font-medium text-white">
            {displayEntity.title || displayEntity.label}
          </h3>
          {displayEntity.subtitle && (
            <p className="mt-1 break-words text-sm text-slate-400">{displayEntity.subtitle}</p>
          )}
        </div>

        {detailsQuery.isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading related context...
          </div>
        )}

        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Metadata
          </h4>
          <div className="space-y-2 rounded-lg bg-white/5 p-4 text-sm text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Source</span>
              <span className="capitalize">{displayEntity.source}</span>
            </div>
            {Object.entries(displayEntity.metadata || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <span className="text-slate-500 capitalize">{key}</span>
                <span className="max-w-[180px] truncate text-right" title={String(value)}>
                  {formatMetadataValue(value)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {relatedEntities.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Related
            </h4>
            <div className="space-y-2">
              {relatedEntities.slice(0, 8).map((related) => (
                <div
                  key={related.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3"
                >
                  {TYPE_ICONS[related.type]}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {related.title || related.label}
                    </p>
                    <p className="text-xs capitalize text-slate-500">{related.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {actions.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </h4>
            <div className="space-y-2">
              {actions.map((action, idx) => (
                <button
                  key={`${action.label}-${idx}`}
                  onClick={() => onAction(action)}
                  className="w-full rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-left text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
