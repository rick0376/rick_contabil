//src/app/api/clients/route.ts

import {
    AuditAction,
    ClientType,
    Prisma,
    RecordStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { clientCreateSchema } from "@/lib/clients/client.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeDigits(value?: string) {
    const normalized = value?.replace(/\D/g, "") ?? "";

    return normalized || null;
}

function parseDate(value?: string) {
    if (!value) {
        return null;
    }

    return new Date(`${value}T12:00:00.000Z`);
}

export async function GET(request: NextRequest) {
    const authenticatedUser = await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message: "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() ?? "";
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");

    const type = Object.values(ClientType).includes(
        typeParam as ClientType,
    )
        ? (typeParam as ClientType)
        : undefined;

    const status = Object.values(RecordStatus).includes(
        statusParam as RecordStatus,
    )
        ? (statusParam as RecordStatus)
        : RecordStatus.ACTIVE;

    const numericSearch = search.replace(/\D/g, "");

    const searchFilters: Prisma.ClientWhereInput[] = search
        ? [
            {
                name: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                tradeName: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                email: {
                    contains: search,
                    mode: "insensitive",
                },
            },
        ]
        : [];

    if (numericSearch) {
        searchFilters.push({
            documentNumber: {
                contains: numericSearch,
            },
        });
    }

    const clients = await prisma.client.findMany({
        where: {
            userId: authenticatedUser.user.id,
            deletedAt: null,
            type,
            status,
            ...(searchFilters.length > 0
                ? {
                    OR: searchFilters,
                }
                : {}),
        },

        select: {
            id: true,
            type: true,
            status: true,
            name: true,
            tradeName: true,
            documentNumber: true,
            email: true,
            phone: true,
            mobile: true,
            createdAt: true,
            updatedAt: true,

            addresses: {
                orderBy: [
                    {
                        isPrimary: "desc",
                    },
                    {
                        createdAt: "asc",
                    },
                ],

                select: {
                    id: true,
                    type: true,
                    street: true,
                    number: true,
                    complement: true,
                    district: true,
                    city: true,
                    state: true,
                    zipCode: true,
                    country: true,
                    isPrimary: true,
                },
            },
        },

        orderBy: [
            {
                name: "asc",
            },
            {
                createdAt: "desc",
            },
        ],

        take: 200,
    });

    return NextResponse.json({
        clients,
        total: clients.length,
    });
}

export async function POST(request: NextRequest) {
    const authenticatedUser = await getCurrentAppUser();

    if (!authenticatedUser) {
        return NextResponse.json(
            {
                message: "Sessão inválida ou expirada.",
            },
            {
                status: 401,
            },
        );
    }

    try {
        const body: unknown = await request.json();

        const parsed = clientCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Verifique os dados informados.",
                    errors: parsed.error.flatten(),
                },
                {
                    status: 400,
                },
            );
        }

        const input = parsed.data;

        const documentNumber = normalizeDigits(input.documentNumber);

        const client = await prisma.$transaction(
            async (transaction) => {
                const createdClient = await transaction.client.create({
                    data: {
                        userId: authenticatedUser.user.id,
                        type: input.type,
                        name: input.name,
                        tradeName: input.tradeName ?? null,
                        documentNumber,
                        secondaryDocument: input.secondaryDocument ?? null,
                        stateRegistration: input.stateRegistration ?? null,
                        birthOrFoundationDate: parseDate(
                            input.birthOrFoundationDate,
                        ),
                        email: input.email ?? null,
                        phone: input.phone ?? null,
                        mobile: input.mobile ?? null,
                        notes: input.notes ?? null,

                        addresses:
                            input.addresses.length > 0
                                ? {
                                    create: input.addresses.map((address) => ({
                                        type: address.type,
                                        street: address.street,
                                        number: address.number ?? null,
                                        complement: address.complement ?? null,
                                        district: address.district ?? null,
                                        city: address.city,
                                        state: address.state,
                                        zipCode: normalizeDigits(address.zipCode),
                                        country: address.country,
                                        isPrimary: address.isPrimary,
                                    })),
                                }
                                : undefined,
                    },

                    include: {
                        addresses: {
                            orderBy: [
                                {
                                    isPrimary: "desc",
                                },
                                {
                                    createdAt: "asc",
                                },
                            ],
                        },
                    },
                });

                await transaction.auditEvent.create({
                    data: {
                        userId: authenticatedUser.user.id,
                        entityType: "Client",
                        entityId: createdClient.id,
                        action: AuditAction.CREATE,
                        description: `Cliente ${createdClient.name} cadastrado.`,

                        newData: {
                            id: createdClient.id,
                            type: createdClient.type,
                            name: createdClient.name,
                            documentNumber: createdClient.documentNumber,
                            email: createdClient.email,
                        },

                        userAgent: request.headers.get("user-agent"),

                        ipAddress:
                            request.headers
                                .get("x-forwarded-for")
                                ?.split(",")[0]
                                ?.trim() ??
                            request.headers.get("x-real-ip"),
                    },
                });

                return createdClient;
            },
        );

        return NextResponse.json(
            {
                message: "Cliente cadastrado com sucesso.",
                client,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    message:
                        "Já existe um cliente cadastrado com esse CPF ou CNPJ.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error("Erro ao cadastrar cliente:", error);

        return NextResponse.json(
            {
                message: "Não foi possível cadastrar o cliente.",
            },
            {
                status: 500,
            },
        );
    }
}