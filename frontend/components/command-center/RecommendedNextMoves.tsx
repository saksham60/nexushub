"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function RecommendedNextMoves() {
  const recommendations = [
    { title: "Draft replies to 5 urgent emails", action: "Generate" },
    { title: "Prepare Q3 review agenda", action: "Prepare" },
    { title: "Summarize latest financial report", action: "Summarize" },
  ];

  return (
    <Card className="p-5 border-zinc-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-zinc-900">Recommended Next Moves</h3>
      </div>
      
      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-zinc-100 shadow-sm hover:border-blue-200 transition-colors">
            <span className="text-sm font-medium text-zinc-700">{rec.title}</span>
            <Button size="sm" variant="secondary" className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800">
              {rec.action} <ArrowRight className="h-3 w-3 ml-1.5" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
