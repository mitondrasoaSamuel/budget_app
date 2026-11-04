import {
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDownload,
  FiHome,
  FiLogOut,
  FiMenu,
  FiMinus,
  FiPlus,
  FiRotateCcw,
  FiSettings,
  FiTarget,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { HiOutlineCash, HiOutlineReceiptTax } from "react-icons/hi";
import type { IconType } from "react-icons";

const MAP: Record<string, IconType> = {
  home: FiHome,
  budget: HiOutlineCash,
  receipt: HiOutlineReceiptTax,
  target: FiTarget,
  chart: FiBarChart2,
  settings: FiSettings,
  plus: FiPlus,
  logout: FiLogOut,
  menu: FiMenu,
  close: FiX,
  left: FiChevronLeft,
  right: FiChevronRight,
  down: FiChevronDown,
  download: FiDownload,
  check: FiCheck,
  minus: FiMinus,
  trash: FiTrash2,
  book: FiBookOpen,
  undo: FiRotateCcw,
  wallet: FiCreditCard,
};

export function AppIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = MAP[name] || FiHome;
  return <Icon size={size} aria-hidden />;
}
