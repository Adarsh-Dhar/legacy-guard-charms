import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/vaults/:id
 * Get a specific vault by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const vaultId = id

		const vault = await prisma.vault.findUnique({
			where: { id: vaultId },
		})

		if (!vault) {
			return NextResponse.json(
				{ error: "Vault not found" },
				{ status: 404 }
			)
		}

		return NextResponse.json(
			{
				success: true,
				vault: {
					...vault,
					lockedAmountSatoshis: vault.lockedAmountSatoshis.toString(),
				},
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error("Error fetching vault:", error)
		return NextResponse.json(
			{ error: "Failed to fetch vault", details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		)
	}
}
