import { SVGProps } from 'react';

export function Kick(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14.5 13.5L12 11.5L9.5 13.5L8 12V2H16V12L14.5 13.5ZM18 14H22V22H18V14ZM2 14H6V22H2V14Z" />
    </svg>
  );
}

export function Livepeer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z" />
      <path d="M168 128a40 40 0 0 1-73.13 24.08l-42.4-42.4a104.08 104.08 0 0 0 42.4 119.19A40 40 0 0 1 168 128Z" />
    </svg>
  );
}
