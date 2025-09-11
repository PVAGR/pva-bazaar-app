import { default as React } from 'react';
export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    variant?: "elevated" | "outline" | "flat";
    header?: React.ReactNode;
    footer?: React.ReactNode;
};
export declare const Card: React.FC<CardProps>;
