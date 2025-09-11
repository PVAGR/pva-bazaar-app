import { default as React } from 'react';
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "tertiary";
};
export declare const Button: React.FC<ButtonProps>;
