"use client";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <MantineProvider defaultColorScheme="light">{children}</MantineProvider>;
}
