import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/vaults/:id/claim
 * Claim a vault - transfers the locked amount to the heir
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const vaultId = id
		const body = await request.json()

		const { heirAddress, claimTxId } = body

		if (!heirAddress || !claimTxId) {
			return NextResponse.json(
				{ error: "Missing required fields: heirAddress, claimTxId" },
				{ status: 400 }
			)
		}

		// Fetch the vault
		const vault = await prisma.vault.findUnique({
			where: { id: vaultId },
		})

		if (!vault) {
			return NextResponse.json(
				{ error: "Vault not found" },
				{ status: 404 }
			)
		}

		// Check if vault is claimable
		if (vault.status !== "CLAIMABLE") {
			return NextResponse.json(
				{ error: `Vault is ${vault.status} and cannot be claimed` },
				{ status: 400 }
			)
		}

		// Verify the heir address matches
		if (vault.nomineeAddress !== heirAddress) {
			return NextResponse.json(
				{ error: "Unauthorized: You are not the heir for this vault" },
				{ status: 403 }
			)
		}

		// Update vault status to CLAIMED
		const updatedVault = await prisma.vault.update({
			where: { id: vaultId },
			data: {
				status: "CLAIMED",
				claimedAt: new Date(),
				claimedTxId: claimTxId,
			},
		})

		return NextResponse.json(
			{
				success: true,
				message: "Vault claimed successfully",
				vault: {
					...updatedVault,
					lockedAmountSatoshis: updatedVault.lockedAmountSatoshis.toString(),
				},
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error("Error claiming vault:", error)
		return NextResponse.json(
			{ error: "Failed to claim vault", details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		)
	}
}
