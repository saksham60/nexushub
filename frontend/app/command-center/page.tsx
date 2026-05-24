"use client";

import { useActionQueue } from "@/features/command-center/hooks/useActionQueue";
import { MorningBrief } from "@/components/command-center/MorningBrief";
import { ExecutiveSnapshotStrip } from "@/components/command-center/ExecutiveSnapshotStrip";
import { PriorityWorkFeed } from "@/components/command-center/PriorityWorkFeed";
import { DecisionPanel } from "@/components/command-center/DecisionPanel";
import { RecommendedNextMoves } from "@/components/command-center/RecommendedNextMoves";
import { ReportBuilderWidget } from "@/components/command-center/ReportBuilderWidget";
import { AlertCircle } from "lucide-react";

export default function CommandCenterPage() {
  const { 
    items, 
    filteredItems, 
    isLoading, 
    isError, 
    activeFilter, 
    setActiveFilter, 
    selectedItem, 
    setSelectedItem 
  } = useActionQueue();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {isError && (
        <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm border border-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p>NexusHub could not load Microsoft 365 activity. Check backend connection or try again.</p>
        </div>
      )}

      <MorningBrief />
      
      <ExecutiveSnapshotStrip items={items} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* Left Column: Feed */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="h-[600px]">
            <PriorityWorkFeed 
              items={filteredItems}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Right Column: Panel & Widgets */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="h-[600px]">
            <DecisionPanel item={selectedItem} />
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <RecommendedNextMoves />
            <ReportBuilderWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
