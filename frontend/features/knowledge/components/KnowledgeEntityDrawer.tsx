import React from "react";
import { KnowledgeNode } from "../types";
import { X, Mail, Calendar, FileText, User, CheckSquare, Zap, Hash } from "lucide-react";

interface Props {
  entity: KnowledgeNode | null;
  onClose: () => void;
  onAction: (action: any) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-5 h-5 text-orange-500" />,
  meeting: <Calendar className="w-5 h-5 text-purple-500" />,
  document: <FileText className="w-5 h-5 text-green-500" />,
  person: <User className="w-5 h-5 text-blue-500" />,
  user: <User className="w-5 h-5 text-blue-500" />,
  approval: <CheckSquare className="w-5 h-5 text-red-500" />,
  automation: <Zap className="w-5 h-5 text-cyan-500" />,
  topic: <Hash className="w-5 h-5 text-yellow-500" />
};

export function KnowledgeEntityDrawer({ entity, onClose, onAction }: Props) {
  if (!entity) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-slate-900/80 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right z-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {TYPE_ICONS[entity.type]}
          <h2 className="text-lg font-semibold text-white capitalize">{entity.type} Details</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
        <div>
          <h3 className="text-xl font-medium text-white mb-1">{entity.title || entity.label}</h3>
          {entity.subtitle && <p className="text-sm text-slate-400">{entity.subtitle}</p>}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Metadata</h4>
          <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Source</span>
              <span className="capitalize">{entity.source}</span>
            </div>
            {Object.entries(entity.metadata || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-500 capitalize">{key}</span>
                <span className="truncate max-w-[140px]" title={String(value)}>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {entity.actions && entity.actions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</h4>
            <div className="space-y-2">
              {entity.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onAction(action)}
                  className="w-full text-left px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20 text-sm font-medium"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
