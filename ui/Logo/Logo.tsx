import { cn } from "@/lib/utils";
import Image, { ImageProps } from "next/image";
import React from "react";

/**
 * Boilerplate logo, repointed at this project's generated brand mark — it
 * still referenced the template's StackWalls assets, which do not exist here.
 * Site chrome uses `components/site/Brand` (mark + wordmark); this stays for
 * anywhere a bare mark is wanted.
 */
export default function Logo(
  props: Omit<ImageProps, "src" | "alt"> & { mobile?: boolean }
) {
  const { className, mobile, ...others } = props;
  return (
    <Image
      src="/img/logo-mark.svg"
      alt="CongoTravel"
      width={mobile ? 32 : 40}
      height={mobile ? 32 : 40}
      {...others}
      className={cn(className)}
    />
  );
}
