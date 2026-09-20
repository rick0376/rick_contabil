// src/proxy.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

function isProtectedApiRequest(
  request: NextRequest,
) {
  return request.nextUrl.pathname.startsWith(
    "/api/",
  );
}

export function proxy(
  request: NextRequest,
) {
  const token =
    request.cookies.get(
      "pericia_session",
    )?.value;

  if (token) {
    return NextResponse.next();
  }

  if (
    isProtectedApiRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Sessão inválida ou expirada.",
      },
      {
        status: 401,

        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  }

  const loginUrl =
    new URL(
      "/login",
      request.url,
    );

  loginUrl.searchParams.set(
    "redirect",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(
    loginUrl,
  );
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/processos/:path*",
    "/historico/:path*",
    "/laudos/:path*",
    "/perfil-profissional/:path*",
    "/analises-financeiras/:path*",
    "/juros-simples/:path*",
    "/juros-compostos/:path*",
    "/valor-presente/:path*",
    "/valor-futuro/:path*",
    "/sistema-price/:path*",
    "/sistema-sac/:path*",
    "/sistema-gauss/:path*",
    "/fluxo-caixa/:path*",
    "/analise-pericial/:path*",
    "/api/reports/:path*",
  ],
};