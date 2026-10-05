"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "logout";
  size?: "md" | "sm";
  icon?: ReactNode;
};

export function Button({
  variant = "default",
  size = "md",
  icon,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  const cls = ["btn", variant !== "default" ? variant : "", size === "sm" ? "small" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}
