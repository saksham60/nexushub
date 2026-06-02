"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  FileSearch,
  Loader2,
  MailCheck,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useConnectMicrosoft, useMicrosoftStatus } from "@/features/auth/hooks";
import { useBackendHealth } from "@/features/health/hooks";

const capabilities = [
  {
    title: "Priority work feed",
    description: "Mail, meetings, approvals, and files are ranked into one executive queue.",
    icon: MailCheck,
  },
  {
    title: "Meeting and decision prep",
    description: "Calendar context, documents, and suggested next moves stay attached to the work.",
    icon: CalendarCheck,
  },
  {
    title: "Workspace knowledge graph",
    description: "People, documents, emails, and meetings resolve into a navigable operating map.",
    icon: Network,
  },
];

const workflow = [
  { label: "Outlook", value: "Reply risk", icon: MailCheck },
  { label: "Calendar", value: "Agenda impact", icon: CalendarCheck },
  { label: "OneDrive", value: "Review queue", icon: FileSearch },
  { label: "Knowledge", value: "Relationship context", icon: Network },
];

export default function LandingPage() {
  const router = useRouter();
  const connectMicrosoft = useConnectMicrosoft();
  const microsoftStatus = useMicrosoftStatus();
  const backendHealth = useBackendHealth();
  const isConnected = microsoftStatus.data?.connected === true;

  useEffect(() => {
    if (isConnected) {
      router.replace("/command-center");
    }
  }, [isConnected, router]);

  const isChecking = microsoftStatus.isLoading || backendHealth.isLoading;

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <section className="relative min-h-[88svh] overflow-hidden">
        <Image
          src="/landing-hero-command-center.png"
          alt="NexusHub command center product interface"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,15,0.98)_0%,rgba(7,10,15,0.9)_30%,rgba(7,10,15,0.42)_62%,rgba(7,10,15,0.16)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,15,0.2)_0%,rgba(7,10,15,0.04)_58%,#070a0f_100%)]" />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <Sparkles className="h-5 w-5 text-[#8dd5ff]" />
            </div>
            <span className="text-lg font-semibold tracking-tight">NexusHub</span>
          </div>
          <button
            onClick={() => connectMicrosoft()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            Connect <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <div className="relative z-10 flex min-h-[calc(88svh-5rem)] items-center px-5 pb-12 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
              <span className={backendHealth.data?.status === "ok" ? "h-2 w-2 rounded-full bg-emerald-300" : "h-2 w-2 rounded-full bg-amber-300"} />
              {backendHealth.data?.status === "ok" ? "Backend ready" : "Backend waking"}
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl">
              NexusHub
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              The AI command center for Microsoft 365 work: priority decisions, meeting prep,
              document intelligence, and workspace context in one cockpit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => connectMicrosoft()}
                disabled={microsoftStatus.isLoading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200 disabled:opacity-60"
              >
                {microsoftStatus.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MicrosoftMark />}
                Continue with Microsoft 365
              </button>
              <button
                onClick={() => document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                View workflow <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> OAuth-based Microsoft access
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-300" /> Human approval before write actions
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-white/10 bg-[#0a1018] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
          {workflow.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <item.icon className="mb-4 h-5 w-5 text-[#8dd5ff]" />
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="mt-1 text-sm text-slate-400">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Built for the daily operating rhythm.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              NexusHub turns Microsoft 365 activity into an actionable control surface for
              leaders and operators who repeat the same review, prepare, decide, and follow-up
              cycle every day.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                <item.icon className="mb-8 h-6 w-6 text-[#8dd5ff]" />
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MicrosoftMark() {
  return (
    <span className="grid h-4 w-4 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#f25022]" />
      <span className="bg-[#7fba00]" />
      <span className="bg-[#00a4ef]" />
      <span className="bg-[#ffb900]" />
    </span>
  );
}
