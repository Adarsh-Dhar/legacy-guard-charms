import { NextRequest, NextResponse } from 'next/server'

function extractPublicKeyFromInput(input: any): string | null {
  try {
    if (input.witness && Array.isArray(input.witness)) {
      for (const item of input.witness) {
        if (typeof item === 'string' && /^[0-9a-f]{64}$/.test(item)) {
          return item.toLowerCase()
        }
        if (typeof item === 'string' && /^[0-9a-f]{66}$/.test(item)) {
          return item.toLowerCase().slice(2)
        }
      }
    }

    if (input.inner_witnessscript_asm) {
      const matches = input.inner_witnessscript_asm.match(/[0-9a-f]{64}|[0-9a-f]{66}/gi)
      if (matches) {
        for (const match of matches) {
          if (match.length === 64) return match.toLowerCase()
          if (match.length === 66) return match.toLowerCase().slice(2)
        }
      }
    }

    if (input.scriptsig_asm) {
      const matches = input.scriptsig_asm.match(/[0-9a-f]{64}|[0-9a-f]{66}|[0-9a-f]{130}/gi)
      if (matches) {
        for (const match of matches) {
          if (match.length === 64) return match.toLowerCase()
          if (match.length === 66) return match.toLowerCase().slice(2)
          if (match.length === 130) return match.toLowerCase().slice(2)
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting public key:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    const isTestnet = address.startsWith('tb1') || address.startsWith('tc1') || address.startsWith('2') || address.startsWith('n') || address.startsWith('m')
    const baseUrl = isTestnet 
      ? 'https://blockstream.info/testnet/api' 
      : 'https://blockstream.info/api'

    try {
      console.log(`Fetching address data for ${address} on ${isTestnet ? 'testnet' : 'mainnet'}`)
      
      const addressResponse = await fetch(`${baseUrl}/address/${address}`)
      
      if (!addressResponse.ok) {
        if (addressResponse.status === 404) {
          return NextResponse.json(
            { error: 'Address not found. Make sure it\'s a valid Bitcoin address.' },
            { status: 404 }
          )
        }
        throw new Error(`API error: ${addressResponse.status}`)
      }

      const addressData = await addressResponse.json()
      console.log('Address data:', JSON.stringify(addressData, null, 2))

      const hasConfirmedTxs = addressData.chain_stats && (addressData.chain_stats.tx_count > 0 || addressData.chain_stats.funded_txo_count > 0)
      const hasUnconfirmedTxs = addressData.mempool_stats && (addressData.mempool_stats.tx_count > 0 || addressData.mempool_stats.funded_txo_count > 0)

      if (!hasConfirmedTxs && !hasUnconfirmedTxs) {
        return NextResponse.json(
          { error: 'Address has no transactions. Please send funds from this address first to reveal its public key.' },
          { status: 400 }
        )
      }

      let txList = []
      try {
        const txResponse = await fetch(`${baseUrl}/address/${address}/txs`)
        if (txResponse.ok) {
          txList = await txResponse.json()
        }
      } catch (e) {
        console.error('Error fetching tx list:', e)
      }

      if (!txList || txList.length === 0) {
        return NextResponse.json(
          { error: 'Could not fetch transaction list. Please try again.' },
          { status: 400 }
        )
      }

      for (const tx of txList.slice(0, 20)) {
        if (tx.vin && Array.isArray(tx.vin)) {
          for (const input of tx.vin) {
            const pubkey = extractPublicKeyFromInput(input)
            if (pubkey && pubkey.length === 64) {
              console.log('Found public key:', pubkey)
              return NextResponse.json({ publicKey: pubkey })
            }
          }
        }
      }

      return NextResponse.json(
        { error: 'Could not extract public key from transaction history. Try with an address that has spent funds.' },
        { status: 400 }
      )
    } catch (blockstreamError) {
      console.error('Blockstream API error:', blockstreamError)
      throw blockstreamError
    }
  } catch (error) {
    console.error('Error in derive-pubkey API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
