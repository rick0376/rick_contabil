//src/app/api/clients/[clientId]/route.ts

import { AuditAction, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { clientCreateSchema } from "@/lib/clients/client.schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        clientId: string;
    }>;
};

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

function getRequestIp(request: NextRequest) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip")
    );
}

export async function GET(
    _request: NextRequest,
    context: RouteContext,
) {
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

    const { clientId } = await context.params;

    const client = await prisma.client.findFirst({
        where: {
            id: clientId,
            userId: authenticatedUser.user.id,
            deletedAt: null,
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

    if (!client) {
        return NextResponse.json(
            {
                message: "Cliente não encontrado.",
            },
            {
                status: 404,
            },
        );
    }

    return NextResponse.json({
        client,
    });
}

export async function PATCH(
    request: NextRequest,
    context: RouteContext,
) {
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

    const { clientId } = await context.params;

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

        const currentClient = await prisma.client.findFirst({
            where: {
                id: clientId,
                userId: authenticatedUser.user.id,
                deletedAt: null,
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

        if (!currentClient) {
            return NextResponse.json(
                {
                    message: "Cliente não encontrado.",
                },
                {
                    status: 404,
                },
            );
        }

        const input = parsed.data;
        const documentNumber = normalizeDigits(input.documentNumber);

        const updatedClient = await prisma.$transaction(
            async (transaction) => {
                const client = await transaction.client.update({
                    where: {
                        id: currentClient.id,
                    },

                    data: {
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

                        addresses: {
                            deleteMany: {},

                            ...(input.addresses.length > 0
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
                                : {}),
                        },
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
                        user: {
                            connect: {
                                id: authenticatedUser.user.id,
                            },
                        },

                        entityType: "Client",
                        entityId: client.id,
                        action: AuditAction.UPDATE,
                        description: `Cliente ${client.name} atualizado.`,

                        previousData: {
                            type: currentClient.type,
                            name: currentClient.name,
                            tradeName: currentClient.tradeName,
                            documentNumber: currentClient.documentNumber,
                            secondaryDocument: currentClient.secondaryDocument,
                            stateRegistration: currentClient.stateRegistration,
                            birthOrFoundationDate:
                                currentClient.birthOrFoundationDate?.toISOString() ??
                                null,
                            email: currentClient.email,
                            phone: currentClient.phone,
                            mobile: currentClient.mobile,
                            notes: currentClient.notes,
                            addresses: currentClient.addresses.map((address) => ({
                                type: address.type,
                                street: address.street,
                                number: address.number,
                                complement: address.complement,
                                district: address.district,
                                city: address.city,
                                state: address.state,
                                zipCode: address.zipCode,
                                country: address.country,
                                isPrimary: address.isPrimary,
                            })),
                        },

                        newData: {
                            type: client.type,
                            name: client.name,
                            tradeName: client.tradeName,
                            documentNumber: client.documentNumber,
                            secondaryDocument: client.secondaryDocument,
                            stateRegistration: client.stateRegistration,
                            birthOrFoundationDate:
                                client.birthOrFoundationDate?.toISOString() ?? null,
                            email: client.email,
                            phone: client.phone,
                            mobile: client.mobile,
                            notes: client.notes,
                            addresses: client.addresses.map((address) => ({
                                type: address.type,
                                street: address.street,
                                number: address.number,
                                complement: address.complement,
                                district: address.district,
                                city: address.city,
                                state: address.state,
                                zipCode: address.zipCode,
                                country: address.country,
                                isPrimary: address.isPrimary,
                            })),
                        },

                        userAgent: request.headers.get("user-agent"),
                        ipAddress: getRequestIp(request),
                    },
                });

                return client;
            },
        );

        return NextResponse.json({
            message: "Cliente atualizado com sucesso.",
            client: updatedClient,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    message:
                        "Já existe outro cliente cadastrado com esse CPF ou CNPJ.",
                },
                {
                    status: 409,
                },
            );
        }

        console.error("Erro ao atualizar cliente:", error);

        return NextResponse.json(
            {
                message: "Não foi possível atualizar o cliente.",
            },
            {
                status: 500,
            },
        );
    }
}