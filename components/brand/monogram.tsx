/**
 * Elevate Etiquette monogram — the interlocking "EE" seal inside its double
 * ring, from the May 2026 brand kit. Drawn with `currentColor` so it inherits
 * the surrounding text color (e.g. `text-primary`) and adapts to light/dark.
 */
type MonogramProps = {
  className?: string;
  title?: string;
};

export function Monogram({
  className,
  title = "Elevate Etiquette",
}: MonogramProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      role={title ? "img" : undefined}
      viewBox="0 0 1206.01 1206.01"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <circle
        cx="603.01"
        cy="603.01"
        r="567.84"
        stroke="currentColor"
        strokeMiterlimit={10}
        strokeWidth={12.03}
      />
      <circle
        cx="603.01"
        cy="603.01"
        r="600"
        stroke="currentColor"
        strokeMiterlimit={10}
        strokeWidth={6.01}
      />
      <g fill="currentColor">
        <path d="M542.46,832.44c0,20.08-8.78,30.89-25.09,30.89h-104.74c-56.45,0-89.69-18.54-110.38-83.43l-5.64,1.54,5.64,91.93h300.41v-8.5c-17.56-5.41-25.07-18.54-25.07-89.6v-344.53c0-71.07,7.52-84.2,25.07-89.61v-8.5h-281.59l-7.53,91.93,5.64,1.54c19.45-60.25,53.94-83.43,110.38-83.43h112.9v489.76Z" />
        <path d="M543.02,530.6c-65.23,0-79.02-17.77-84.05-46.35h-6.89v102.74h6.89c5.03-28.58,18.82-46.34,84.05-46.34v-10.04Z" />
        <path d="M663.55,373.57c0-20.08,8.78-30.89,25.09-30.89h104.74c56.45,0,89.69,18.54,110.38,83.43l5.64-1.54-5.64-91.93h-300.41v8.5c17.56,5.41,25.07,18.54,25.07,89.6v344.53c0,71.07-7.52,84.2-25.07,89.61v8.5h281.59l7.53-91.93-5.64-1.54c-19.45,60.25-53.94,83.43-110.38,83.43h-112.9v-489.76Z" />
        <path d="M662.99,675.42c65.23,0,79.02,17.77,84.05,46.35h6.89v-102.74h-6.89c-5.03,28.58-18.82,46.34-84.05,46.34v10.04Z" />
        <path d="M603.35,332.64h-.68v8.5c.08-.03.19-.06.34-.06s.27.03.34.06" />
        <path d="M603.35,873.38h-.68v-8.5c.06.03.18.08.34.08s.28-.05.34-.08" />
      </g>
    </svg>
  );
}
