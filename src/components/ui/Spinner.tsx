import { ImSpinner8 } from "react-icons/im";

export function Spinner({ size = 22, block }: { size?: number; block?: boolean }) {
  return (
    <div className={block ? "spinner-block" : "spinner-inline"} role="status">
      <ImSpinner8 className="spinner-icon" size={size} aria-hidden />
      <span className="sr-only">Chargement</span>
    </div>
  );
}
