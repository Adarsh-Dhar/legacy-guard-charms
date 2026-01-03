"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useUnisat } from "@/hooks/useUnisat"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Vault {
	id: string
	txId: string
	ownerAddress: string
	nomineeAddress: string
	lockedAmount: string
	lockedAmountSatoshis: string
	inactivityTimeout: string
	inactivityTimeoutBlocks: number
	createdAt: string
	claimedAt: string | null
	status: "ACTIVE" | "CLAIMABLE" | "CLAIMED"
}

export default function ClaimVaultPage() {
	const params = useParams()
	const router = useRouter()
	const vaultId = params.id as string
	const { address } = useUnisat()

	const [vault, setVault] = useState<Vault | null>(null)
	const [loading, setLoading] = useState(true)
	const [claiming, setClaiming] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	useEffect(() => {
		async function fetchVault() {
			try {
				const response = await fetch(`/api/vaults/${vaultId}`)
				if (response.ok) {
					const data = await response.json()
					setVault(data.vault)
				} else {
					setError("Failed to load vault details")
				}
			} catch (err) {
				setError("Error fetching vault details")
				console.error(err)
			} finally {
				setLoading(false)
			}
		}

		if (vaultId) {
			fetchVault()
		}
	}, [vaultId])

	const handleClaim = async () => {
		if (!vault || !address) {
			setError("Missing vault or wallet information")
			return
		}

		// Verify the user is the heir
		if (vault.nomineeAddress !== address) {
			setError("You are not the authorized heir for this vault")
			return
		}

		setClaiming(true)
		setError(null)

		try {
			const response = await fetch(`/api/vaults/${vaultId}/claim`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					heirAddress: address,
					claimTxId: `claim-${Date.now()}`, // Placeholder - should be actual tx ID from blockchain
				}),
			})

			if (response.ok) {
				const data = await response.json()
				setSuccess(true)
				setVault(data.vault)
				// Redirect back to vaults page after 2 seconds
				setTimeout(() => {
					router.push("/vaults")
				}, 2000)
			} else {
				const errorData = await response.json()
				setError(errorData.error || "Failed to claim vault")
			}
		} catch (err) {
			setError("Error claiming vault")
			console.error(err)
		} finally {
			setClaiming(false)
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col">
				<Header />
				<main className="flex-1 flex items-center justify-center px-4 py-12">
					<p className="text-muted-foreground">Loading vault details...</p>
				</main>
				<Footer />
			</div>
		)
	}

	if (!vault) {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col">
				<Header />
				<main className="flex-1 flex items-center justify-center px-4 py-12">
					<div className="text-center space-y-4">
						<p className="text-muted-foreground">Vault not found</p>
						<Button onClick={() => router.push("/vaults")} variant="outline">
							Back to Vaults
						</Button>
					</div>
				</main>
				<Footer />
			</div>
		)
	}

	if (vault.status === "CLAIMED") {
		return (
			<div className="min-h-screen bg-background text-foreground flex flex-col">
				<Header />
				<main className="flex-1 flex items-center justify-center px-4 py-12">
					<div className="max-w-2xl w-full space-y-6">
						<div className="text-center space-y-2">
							<h1 className="text-2xl font-semibold">Vault Already Claimed</h1>
							<p className="text-sm text-muted-foreground">This vault has already been claimed by the heir.</p>
						</div>
						<div className="bg-card rounded-lg border p-6 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-muted-foreground">Claimed At</p>
									<p className="text-sm mt-1">{vault.claimedAt ? new Date(vault.claimedAt).toISOString().slice(0, 16).replace("T", " ") : "N/A"}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Amount</p>
									<p className="text-sm mt-1">{vault.lockedAmount} BTC</p>
								</div>
							</div>
						</div>
						<Button onClick={() => router.push("/vaults")} variant="outline" className="w-full">
							Back to Vaults
						</Button>
					</div>
				</main>
				<Footer />
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<Header />

			<main className="flex-1 flex items-center justify-center px-4 py-12">
				<div className="max-w-2xl w-full space-y-6">
					<div className="text-center space-y-2">
						<h1 className="text-2xl font-semibold">Claim Vault</h1>
						<p className="text-sm text-muted-foreground">Review the vault details and confirm the claim transaction</p>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{success && (
						<Alert className="bg-green-50 border-green-200">
							<AlertDescription className="text-green-800">
								Vault claimed successfully! Redirecting you back to your vaults...
							</AlertDescription>
						</Alert>
					)}

					<div className="bg-card rounded-lg border p-6 space-y-4">
						<div className="space-y-2">
							<h2 className="text-lg font-semibold">Vault Details</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-muted-foreground">Transaction ID</p>
									<p className="text-sm mt-1 font-mono break-all">{vault.txId}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Vault ID</p>
									<p className="text-sm mt-1 font-mono">{vault.id}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Owner Address</p>
									<p className="text-sm mt-1 font-mono break-all">{vault.ownerAddress}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Heir Address</p>
									<p className="text-sm mt-1 font-mono break-all">{vault.nomineeAddress}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Locked Amount</p>
									<p className="text-sm mt-1 font-semibold">{vault.lockedAmount} BTC</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Amount (Satoshis)</p>
									<p className="text-sm mt-1 font-mono">{vault.lockedAmountSatoshis}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Inactivity Timeout</p>
									<p className="text-sm mt-1">{vault.inactivityTimeout}</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">Timeout Blocks</p>
									<p className="text-sm mt-1">{vault.inactivityTimeoutBlocks}</p>
								</div>
								<div className="md:col-span-2">
									<p className="text-xs font-medium text-muted-foreground">Created At</p>
									<p className="text-sm mt-1">{new Date(vault.createdAt).toISOString().slice(0, 16).replace("T", " ")}</p>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
						<h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">How to Claim</h3>
						<ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
							<li>Verify you have access to the heir wallet address</li>
							<li>Ensure you have the spell for this vault available</li>
							<li>Click "Claim Now" to initiate the claim transaction on the blockchain</li>
							<li>Sign the transaction with your wallet</li>
							<li>Wait for the transaction to be confirmed</li>
						</ol>
					</div>

					<div className="space-y-3">
						{!success && (
							<Button
								onClick={handleClaim}
								disabled={claiming || vault.status !== "CLAIMABLE"}
								className="w-full"
								size="lg"
							>
								{claiming ? "Claiming..." : "Claim Now"}
							</Button>
						)}
						<Button
							onClick={() => router.push("/vaults")}
							variant="outline"
							className="w-full"
							size="lg"
						>
							Cancel
						</Button>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	)
}
