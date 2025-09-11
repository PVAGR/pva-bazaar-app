import React from "react";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  color?: "sage" | "terracotta" | "gold" | "neutral";
};

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
const colorMap: Record<NonNullable<BadgeProps["color"]>, string> = {
  sage: "bg-pva-sage text-white",
  terracotta: "bg-pva-terracotta text-white",
  gold: "bg-pva-gold text-black",
  neutral: "bg-gray-200 text-gray-800",
};

export const Badge: React.FC<BadgeProps> = ({ color = "neutral", className = "", ...props }) => {
  return <span className={`${base} ${colorMap[color]} ${className}`} {...props} />;
};
