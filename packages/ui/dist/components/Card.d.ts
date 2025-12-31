import * as React from 'react';
export interface CardProps {
  title: string;
  children: React.ReactNode;
  href: string;
}
export declare function Card({ title, children, href }: CardProps): JSX.Element;
