import { cache } from "react";
import { prisma } from "./prisma";

/**
 * `cache()` de React garantit qu'un seul appel base de données est fait
 * même si plusieurs composants serveur (layout + page, par exemple)
 * demandent les réglages dans le même rendu.
 */
export const getPlatformSettings = cache(async () => {
  return prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
});
