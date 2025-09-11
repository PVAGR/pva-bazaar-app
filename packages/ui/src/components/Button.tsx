import React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary";
};

const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-pva-sage text-white hover:bg-pva-sage-light focus-visible:ring-pva-gold",
  secondary: "bg-pva-terracotta text-white hover:bg-pva-terracotta-light focus-visible:ring-pva-gold",
  tertiary: "border border-pva-sage text-pva-sage hover:bg-pva-sage-light hover:text-white"
};

export const Button: React.FC<ButtonProps> = ({ variant = "primary", className = "", ...props }) => {
  const v = variants[variant];
  return <button className={`${base} ${v} ${className}`} {...props} />;
};
