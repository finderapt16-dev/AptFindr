interface AppLogoProps {
  className?: string;
  iconClassName?: string;
}

export function AppLogo({ className = "h-10 w-10 rounded-xl" }: AppLogoProps) {
  return (
    <img src="/icon.svg" alt="" className={`object-contain ${className}`} aria-hidden="true" />
  );
}
