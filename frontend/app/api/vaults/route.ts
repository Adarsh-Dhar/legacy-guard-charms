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
        status: "ACTIVE", // New vaults start as ACTIVE
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
 * GET /api/vaults?address=<heir_address>&status=<status>
 * Get all vaults claimable by a specific heir address, optionally filtered by status
 * Automatically updates vault status based on timeout
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const heirAddress = searchParams.get("address")
    const status = searchParams.get("status")

    if (!heirAddress) {
      return NextResponse.json(
        { error: "Missing required query parameter: address" },
        { status: 400 }
      )
    }

    // First, update any ACTIVE vaults that should be CLAIMABLE based on timeout
    const now = new Date()
    const activeVaults = await prisma.vault.findMany({
      where: {
        status: "ACTIVE",
        nomineeAddress: heirAddress,
      },
    })

    // Check each active vault to see if timeout has passed
    for (const vault of activeVaults) {
      const timeoutBlocks = vault.inactivityTimeoutBlocks || 0
      const createdTime = new Date(vault.createdAt).getTime()
      const currentTime = now.getTime()
      
      // Parse timeout string (e.g., "60-seconds", "1-hour", "1-day")
      const timeoutMs = parseTimeoutToMilliseconds(vault.inactivityTimeout)
      
      // Check if timeout has elapsed
      if (timeoutMs > 0 && currentTime - createdTime >= timeoutMs) {
        await prisma.vault.update({
          where: { id: vault.id },
          data: { status: "CLAIMABLE" },
        })
      }
    }

    // Build the where clause
    const where: any = {
      nomineeAddress: heirAddress,
    }

    // Add status filter if provided
    if (status) {
      if (!["ACTIVE", "CLAIMABLE", "CLAIMED"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be ACTIVE, CLAIMABLE, or CLAIMED" },
          { status: 400 }
        )
      }
      where.status = status
    }

    // Fetch all vaults where the connected address is the nominee (heir)
    const vaults = await prisma.vault.findMany({
      where,
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

/**
 * Helper function to parse timeout string to milliseconds
 */
function parseTimeoutToMilliseconds(timeoutStr: string): number {
  if (!timeoutStr) return 0

  const parts = timeoutStr.toLowerCase().split("-")
  const value = parseInt(parts[0])
  const unit = parts[1]

  if (isNaN(value)) return 0

  const multipliers: Record<string, number> = {
    "second": 1000,
    "seconds": 1000,
    "minute": 60 * 1000,
    "minutes": 60 * 1000,
    "hour": 60 * 60 * 1000,
    "hours": 60 * 60 * 1000,
    "day": 24 * 60 * 60 * 1000,
    "days": 24 * 60 * 60 * 1000,
    "week": 7 * 24 * 60 * 60 * 1000,
    "weeks": 7 * 24 * 60 * 60 * 1000,
    "month": 30 * 24 * 60 * 60 * 1000,
    "months": 30 * 24 * 60 * 60 * 1000,
    "year": 365 * 24 * 60 * 60 * 1000,
    "years": 365 * 24 * 60 * 60 * 1000,
  }

  return value * (multipliers[unit] || 0)
}
