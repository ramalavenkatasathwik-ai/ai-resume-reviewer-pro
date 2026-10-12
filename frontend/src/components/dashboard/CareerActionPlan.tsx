import React, { useState } from 'react';
import { Calendar, CheckSquare, Square, RotateCcw, Sparkles } from 'lucide-react';
import { LinkedInAnalysisResult, PlanWeek } from '@/types/linkedin';

interface CareerActionPlanProps {
  result: LinkedInAnalysisResult;
}

export const CareerActionPlan: React.FC<CareerActionPlanProps> = ({ result }) => {
  const plan: PlanWeek[] =
    result.target_role_alignment?.prioritized_30_day_plan ||
    result.action_plan ||
    [];

  // Track checked state for every action item in memory for this session
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Flatten all action items to calculate completion statistics
  const allActionKeys: { id: string; weekNum: number; text: string }[] = [];
  plan.forEach((week) => {
    week.action_items.forEach((item, itemIdx) => {
      allActionKeys.push({
        id: `week-${week.week}-item-${itemIdx}`,
        weekNum: week.week,
        text: item,
      });
    });
  });

  const totalTasks = allActionKeys.length;
  const completedCount = allActionKeys.filter((k) => completedItems[k.id]).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const toggleTask = (taskId: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleResetChecklist = () => {
    setCompletedItems({});
  };

  const getPriorityBadge = (weekNum: number) => {
    switch (weekNum) {
      case 1:
        return {
          label: 'High Priority',
          className: 'bg-rose-950/60 text-[#F04452] border-rose-800/60',
        };
      case 2:
        return {
          label: 'Medium-High',
          className: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
        };
      case 3:
        return {
          label: 'Medium Priority',
          className: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
        };
      default:
        return {
          label: 'Strategic Growth',
          className: 'bg-[#1C1C23] text-slate-300 border-[#303038]',
        };
    }
  };

  return (
    <div className="bg-[#141419] rounded-2xl border border-[#303038] p-6 sm:p-8 space-y-6">
      {/* Header and Progress Meter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FF7417]" />
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              Prioritized 30-Day Profile Improvement Plan
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Step-by-step roadmap to maximize recruiter visibility and outreach for{' '}
            <span className="text-[#FF7417] font-semibold">{result.target_role}</span>
          </p>
        </div>

        {totalTasks > 0 && (
          <div className="flex items-center gap-4">
            {/* Progress Counter & Meter */}
            <div className="text-right">
              <span className="text-[11px] font-mono text-slate-400 block">
                Session Progress: <strong className="text-white">{completedCount} of {totalTasks}</strong> ({progressPercent}%)
              </span>
              <div className="w-36 bg-[#0B0B0E] h-2 rounded-full overflow-hidden border border-[#303038] mt-1.5 ml-auto">
                <div
                  className="bg-gradient-to-r from-[#C91432] via-[#F04452] to-[#FF7417] h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {completedCount > 0 && (
              <button
                type="button"
                onClick={handleResetChecklist}
                title="Reset session checklist"
                className="px-2.5 py-1.5 rounded-lg bg-[#1C1C23] hover:bg-[#282834] text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors border border-[#303038]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4-Week Plan Grid */}
      {plan.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plan.map((week) => {
            const badge = getPriorityBadge(week.week);
            return (
              <div
                key={week.week}
                className="p-5 rounded-xl bg-[#0B0B0E] border border-[#303038] flex flex-col justify-between hover:border-slate-600 transition-colors"
              >
                <div>
                  {/* Week & Priority Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C1C23] text-[#FF7417] border border-[#303038]">
                      WEEK {week.week}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">
                    {week.focus_title}
                  </h4>

                  {/* Checklist Items */}
                  <div className="mt-4 space-y-2.5">
                    {week.action_items.map((item, idx) => {
                      const taskId = `week-${week.week}-item-${idx}`;
                      const isDone = Boolean(completedItems[taskId]);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTask(taskId)}
                          className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 text-xs transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF7417] ${
                            isDone
                              ? 'bg-emerald-950/30 text-slate-400 line-through'
                              : 'hover:bg-[#1C1C23] text-slate-300'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 group-hover:text-[#FF7417]" />
                            )}
                          </span>
                          <span className="leading-relaxed flex-1">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-[#282834] flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FF7417]" />
                    {week.action_items.filter((_, i) => completedItems[`week-${week.week}-item-${i}`]).length} / {week.action_items.length} done
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic text-center py-4">
          No structured 30-day plan returned for this profile.
        </p>
      )}
    </div>
  );
};

export default CareerActionPlan;
