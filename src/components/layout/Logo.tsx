import type { Branding } from "@/lib/defaults";

export function Logo({ branding, compact }: { branding: Branding; compact?: boolean }) {
  return (
    <div className={`brand-logo${compact ? " compact" : ""}`}>
      {branding.logoDataUrl ? (
        <img src={branding.logoDataUrl} alt="" className="brand-logo-img" />
      ) : (
        <span className="brand-logo-mark" aria-hidden>
          {branding.appName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="brand-logo-text">
        <div className="brand-name">{branding.appName}</div>
       
      </div>
    </div>
  );
}
