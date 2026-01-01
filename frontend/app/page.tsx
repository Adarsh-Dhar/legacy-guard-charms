"use client"

import { useState } from "react"
import Header from "@/components/header"
import CreateVaultForm from "@/components/create-vault-form"
import ActiveVaultDashboard from "@/components/active-vault-dashboard"
import Footer from "@/components/footer"
import { useUnisat } from "@/hooks/useUnisat"

export default function Home() {
  const [isVaultActive, setIsVaultActive] = useState(false)
  const [vaultData, setVaultData] = useState({
    nomineeAddress: "",
    lockedAmount: 0,
    inactivityTimeout: "",
    nomineePubkey: "",
    ownerAddress: "",
    ownerPubkey: "",
    lockedAmountSatoshis: 0,
    inactivityTimeoutBlocks: 0,
    appVerificationKey: "",
  })

  const { address: ownerAddress, publicKey: ownerPubkey } = useUnisat()

  const handleCreateVault = (data: typeof vaultData) => {
    setVaultData(data)
    setIsVaultActive(true)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {!isVaultActive ? (
          <CreateVaultForm 
            ownerAddress={ownerAddress}
            ownerPubkey={ownerPubkey}
            onCreateVault={handleCreateVault} 
          />
        ) : (
          <ActiveVaultDashboard vaultData={vaultData} onExitVault={() => setIsVaultActive(false)} />
        )}
      </main>

      <Footer />
    </div>
  )
}
