import { default as React } from 'react';
export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
    color?: "sage" | "terracotta" | "gold" | "neutral";
};
export declare const Badge: React.FC<BadgeProps>;
