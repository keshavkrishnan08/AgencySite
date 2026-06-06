"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Loader2, MessageCircleQuestion, Newspaper, Heart, Target, Sparkles } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { CompanyIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getBriefings, getProfile, saveBriefing } from "@/lib/store";
import { uid } from "@/lib/utils";
import type { CompanyBriefing } from "@/lib/types";

export default function CompanyResearchPage() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<CompanyBriefing | null>(null);
  const [recent, setRecent] = useState<CompanyBriefing[]>([]);

  useEffect(() => {
    setRole(getProfile().targetRole || "");
    setRecent(getBriefings());
  }, []);

  const generate = async () => {
    if (!company.trim()) return;
    setLoading(true);
    setBriefing(null);
    try {
      const res = await fetch("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role }),
      });
      const data = await res.json();
      const b: CompanyBriefing = {
        id: uid("br"),
        company,
        role,
        whatTheyDo: data.whatTheyDo,
        recentNews: data.recentNews ?? [],
        culture: data.culture ?? [],
        roleFocus: data.roleFocus ?? [],
        questionsToAsk: data.questionsToAsk ?? [],
        savedAt: new Date().toISOString(),
      };
      setBriefing(b);
      saveBriefing(b);
      setRecent(getBriefings());
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      icon={CompanyIcon}
      title="Company Research Briefing"
      description="47% of interview failures come from not knowing the company. Get a one-page briefing in seconds — and walk in knowing more than every other candidate."
    >
      <div className="card p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Company name</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="e.g., Mercy Hospital"
              className="field"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Role you&apos;re interviewing for</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Operations Coordinator" className="field" />
          </label>
        </div>
        <Button onClick={generate} disabled={loading || !company.trim()} size="lg" className="mt-5 w-full">
          {loading ? (<><Loader2 size={18} className="animate-spin" /> Researching…</>) : (<>Generate briefing <Sparkles size={16} /></>)}
        </Button>
      </div>

      {briefing && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          <h2 className="font-serif text-2xl font-semibold text-ink">{briefing.company}</h2>

          <Card icon={Building2} title="What they do">
            <p className="leading-relaxed text-ink-2">{briefing.whatTheyDo}</p>
          </Card>
          <Card icon={Newspaper} title="Recent news to look for">
            <BulletList items={briefing.recentNews} />
          </Card>
          <Card icon={Heart} title="Their culture & values">
            <BulletList items={briefing.culture} />
          </Card>
          <Card icon={Target} title="What this role probably cares about">
            <BulletList items={briefing.roleFocus} />
          </Card>
          <Card icon={MessageCircleQuestion} title="Three smart questions to ask them" accent>
            <BulletList items={briefing.questionsToAsk} accent />
          </Card>
        </motion.div>
      )}

      {recent.length > 0 && !briefing && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink-2">Recent briefings</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((b) => (
              <button key={b.id} onClick={() => setBriefing(b)} className="chip hover:bg-primary-soft hover:text-primary-ink">
                {b.company}
              </button>
            ))}
          </div>
        </div>
      )}
    </ToolShell>
  );
}

function Card({ icon: Icon, title, children, accent }: { icon: any; title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="card p-6" style={accent ? { borderLeft: "4px solid var(--primary)" } : undefined}>
      <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
        <Icon size={18} className="text-primary" /> {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 leading-relaxed text-ink-2">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: accent ? "var(--primary)" : "var(--amber)" }}
          />
          {it}
        </li>
      ))}
    </ul>
  );
}
