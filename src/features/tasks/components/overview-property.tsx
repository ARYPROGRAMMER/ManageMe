interface OverviewPropertyProps {
  label: string;
  children: React.ReactNode;
}

export const OverviewProperty = ({
  label,
  children,
}: OverviewPropertyProps) => {
  return (
    <div className="flex items-start gap-x-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="min-w-[110px]">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-x-2 text-neutral-200">
        {children}
      </div>
    </div>
  );
};
