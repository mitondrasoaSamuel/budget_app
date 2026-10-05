export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
}) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} aria-hidden />;
}

export function DashboardSkeleton() {
  return (
    <div className="page" aria-busy="true">
      <div className="hero">
        <div>
          <Skeleton height={28} width="55%" />
          <div style={{ marginTop: 12 }}>
            <Skeleton height={16} width="80%" />
          </div>
        </div>
        <div className="panel">
          <Skeleton height={18} width="40%" />
          <div style={{ marginTop: 14 }}>
            <Skeleton height={14} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Skeleton height={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
