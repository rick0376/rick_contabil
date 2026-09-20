//lhp-sistema-contabil/src/lib/auth/current-user.ts

import { getAppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getCurrentAppUser() {
    const session = await getAppSession();

    if (!session) {
        return null;
    }

    const user = await prisma.appUserProfile.findUnique({
        where: {
            panelUserId: session.panelUserId,
        },
        select: {
            id: true,
            panelUserId: true,
            name: true,
            username: true,
        },
    });

    if (!user) {
        return null;
    }

    return {
        session,
        user,
    };
}