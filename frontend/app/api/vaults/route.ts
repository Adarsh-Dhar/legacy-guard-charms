import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/vaults
 * Create a new vault entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      txId,
      ownerAddress,
      ownerPubkey,
      nomineeAddress,
      lockedAmount,
      lockedAmountSatoshis,
      inactivityTimeout,
      inactivityTimeoutBlocks,
      appVerificationKey,
      spell,
      timestamp,
    } = body

    // Validation
    if (!txId || !ownerAddress || !nomineeAddress || !lockedAmount || !spell) {
      return NextResponse.json(
        { error: "Missing required fields: txId, ownerAddress, nomineeAddress, lockedAmount, spell" },
        { status: 400 }
      )
    }

    // Check if vault with this txId already exists
    const existingVault = await prisma.vault.findUnique({
      where: { txId },
    })

    if (existingVault) {
      return NextResponse.json(
        { error: "Vault with this transaction ID already exists" },
        { status: 409 }
      )
    }

    // Create the vault
    const vault = await prisma.vault.create({
      data: {
        txId,
        ownerAddress,
        ownerPubkey: ownerPubkey || "",
        nomineeAddress,
        lockedAmount: typeof lockedAmount === "string" ? parseFloat(lockedAmount) : lockedAmount,
        lockedAmountSatoshis: BigInt(lockedAmountSatoshis || 0),
        inactivityTimeout: inactivityTimeout || "",
        inactivityTimeoutBlocks: inactivityTimeoutBlocks || 0,
        appVerificationKey: appVerificationKey || "",
        spell: typeof spell === "string" ? spell : JSON.stringify(spell),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        vault: {
          ...vault,
          lockedAmountSatoshis: vault.lockedAmountSatoshis.toString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating vault:", error)
    return NextResponse.json(
      { error: "Failed to create vault", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vaults?address=<heir_address>
 * Get all vaults claimable by a specific heir address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const heirAddress = searchParams.get("address")

    if (!heirAddress) {
      return NextResponse.json(
        { error: "Missing required query parameter: address" },
        { status: 400 }
      )
    }

    // Fetch all vaults where the connected address is the nominee (heir)
    const vaults = await prisma.vault.findMany({
      where: {
        nomineeAddress: heirAddress,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      {
        success: true,
        count: vaults.length,
        vaults: vaults.map((vault) => ({
          ...vault,
          lockedAmountSatoshis: vault.lockedAmountSatoshis.toString(),
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching vaults:", error)
    return NextResponse.json(
      { error: "Failed to fetch vaults", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
