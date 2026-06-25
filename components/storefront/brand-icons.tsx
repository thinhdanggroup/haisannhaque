import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function ZaloIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#0068FF" />
      <path d="M7 8h18v3.5L13 20.5h12V24H7v-3.5L19 11.5H7z" fill="white" />
    </svg>
  );
}

export function MessengerIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2C6.48 2 2 6.14 2 11.24c0 2.94 1.4 5.56 3.58 7.28V22l3.3-1.81c.88.24 1.82.37 2.78.37 5.52 0 10-4.16 10-9.32C21.66 6.14 17.52 2 12 2z"
        fill="#0084FF"
      />
      <path
        d="M13.1 14.43 10.49 11.7 5.34 14.43 11.01 8.41 13.69 11.14 18.79 8.41z"
        fill="white"
      />
    </svg>
  );
}
