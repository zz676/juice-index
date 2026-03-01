interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  change?: string;
  up?: boolean;
  badge?: string;
  suffix?: string;
}

export function StatCard({ icon, label, value, change, up, badge, suffix }: StatCardProps) {
  return (
    <div className="bg-card p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-custom-100 group hover:border-primary/30 transition-all relative overflow-hidden">
      <div className="flex justify-between items-start mb-3">
        <div className="p-1.5 bg-slate-custom-50 rounded-full text-slate-custom-500">
          <span className="material-icons-round text-xl">{icon}</span>
        </div>
        {change && (
          <span
            className={`${up ? "bg-primary/10 text-green-700" : "bg-red-50 text-red-600"} font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1`}
          >
            <span className="material-icons-round text-sm font-bold">
              {up ? "arrow_upward" : "arrow_downward"}
            </span>{" "}
            {change}
          </span>
        )}
        {badge && (
          <span className="bg-slate-custom-100 text-slate-custom-600 font-semibold text-xs px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-slate-custom-500 text-sm font-medium mb-0.5">{label}</p>
      <h2 className="text-2xl font-bold text-slate-custom-900">
        {value}
        {suffix && (
          <span className="text-lg text-slate-custom-400 font-medium ml-1">{suffix}</span>
        )}
      </h2>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
    </div>
  );
}
