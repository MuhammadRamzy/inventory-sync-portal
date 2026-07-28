import Image from "next/image";
import { BRANDING } from "@/lib/branding";

interface LogoImageProps {
  width: number;
  height: number;
  className?: string;
}

export default function LogoImage({ width, height, className }: LogoImageProps) {
  return (
    <Image
      src={BRANDING.logoSrc}
      alt={`${BRANDING.companyName} Logo`}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
