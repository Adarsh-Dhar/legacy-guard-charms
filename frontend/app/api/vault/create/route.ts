import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

interface CreateVaultRequest {
  ownerPubkey: string
  heirPubkey: string
  heirAddress: string
  amount: number // in satoshis
  timeoutBlocks: number
  inputUtxo: string // Format: "txid:vout"
}

/**
 * API endpoint to generate a Charms spell for vault creation
 * 
 * This endpoint generates the proper Initialize spell that creates
 * an enchanted UTXO (storing funds in the contract) instead of
 * sending directly to the heir.
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateVaultRequest = await request.json()

    // Validate inputs
    if (!body.ownerPubkey || body.ownerPubkey.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid owner public key' },
        { status: 400 }
      )
    }

    if (!body.heirPubkey || body.heirPubkey.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid heir public key' },
        { status: 400 }
      )
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!body.inputUtxo || !body.inputUtxo.includes(':')) {
      return NextResponse.json(
        { error: 'Invalid UTXO format. Expected: txid:vout' },
        { status: 400 }
      )
    }

    // Generate the Initialize spell YAML
    // CRITICAL: Output has 'charms' data but NO 'address' field
    // This creates a Taproot address controlled by the contract
    const spell = `version: 1

inputs:
  - utxo: "${body.inputUtxo}"

outputs:
  - value: ${body.amount}
    charms:
      - app: "c78f9360ba4bc547be980aeb7c55e799184b8a6171d267cc53e1a427cdef7337"
        data:
          action: Initialize
          owner_pubkey: "${body.ownerPubkey}"
          heir_pubkey: "${body.heirPubkey}"
          timeout_blocks: ${body.timeoutBlocks}
    # NOTE: No 'address' field - this creates an enchanted UTXO
    # controlled by the contract's verification key
`

    // Check if Charms CLI is available
    const charmsPath = process.env.CHARMS_CLI_PATH || 'charms'
    const contractPath = process.env.CONTRACT_PATH || join(process.cwd(), '../contract/legacy-guard')

    try {
      await execAsync(`${charmsPath} --version`)
    } catch (error) {
      // Charms CLI not available - return spell for manual use
      return NextResponse.json({
        success: true,
        spell,
        note: 'Charms CLI not available on server. Please use the CLI manually to prove and broadcast this spell.',
        instructions: [
          '1. Save the spell to a file (e.g., initialize.yaml)',
          '2. Run: charms spell check --app-bins=$(charms app build) --mock < initialize.yaml',
          '3. Run: charms spell prove --app-bins=$(charms app build) < initialize.yaml',
          '4. Sign and broadcast the resulting transaction'
        ]
      })
    }

    // Write spell to temporary file
    const tempSpellPath = join(tmpdir(), `vault-${Date.now()}.yaml`)
    await writeFile(tempSpellPath, spell)

    try {
      // Validate the spell using Charms CLI
      const { stdout, stderr } = await execAsync(
        `cat "${tempSpellPath}" | ${charmsPath} spell check --app-bins=$(cd "${contractPath}" && ${charmsPath} app build) --mock`,
        { cwd: contractPath }
      )

      // Clean up temp file
      await unlink(tempSpellPath)

      // If we get here, the spell is valid
      return NextResponse.json({
        success: true,
        spell,
        validation: {
          valid: true,
          output: stdout,
          errors: stderr || null
        },
        note: 'Spell validated successfully. To create the vault, run the spell through Charms CLI.',
        nextSteps: [
          '1. The owner must prove this spell using Charms CLI',
          '2. Sign the resulting PSBT with their Bitcoin wallet',
          '3. Broadcast the signed transaction to Bitcoin network',
          '4. The vault UTXO will be created with funds locked in the contract'
        ]
      })

    } catch (error: any) {
      // Validation failed
      await unlink(tempSpellPath).catch(() => {})
      
      return NextResponse.json({
        success: false,
        spell,
        validation: {
          valid: false,
          error: error.message,
          stderr: error.stderr
        }
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error generating vault spell:', error)
    return NextResponse.json(
      { error: 'Failed to generate vault spell', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to return instructions for vault creation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/vault/create',
    method: 'POST',
    description: 'Generate a Charms Initialize spell that creates an enchanted UTXO for vault storage',
    important: 'This creates a contract-controlled UTXO, NOT a direct transfer to heir',
    body: {
      ownerPubkey: 'string (64 hex characters)',
      heirPubkey: 'string (64 hex characters)',
      heirAddress: 'string (Bitcoin address - for reference only)',
      amount: 'number (amount in satoshis)',
      timeoutBlocks: 'number (e.g., 52560 for ~1 year)',
      inputUtxo: 'string (format: "txid:vout")'
    },
    returns: {
      spell: 'YAML spell that can be used with Charms CLI',
      validation: 'Validation results if Charms CLI is available',
      note: 'Instructions for next steps'
    },
    howItWorks: [
      '1. Generates a proper Initialize spell',
      '2. Output has charms data attached (creates enchanted UTXO)',
      '3. Output has NO address field (Taproot address controlled by contract)',
      '4. Funds are stored in the contract, not transferred to heir',
      '5. Heir can only claim after timeout period expires'
    ]
  })
}
