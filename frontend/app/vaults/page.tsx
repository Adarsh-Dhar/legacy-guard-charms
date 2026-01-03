"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useUnisat } from "@/hooks/useUnisat"
import { Button } from "@/components/ui/button"

interface Vault {
	id: string
	txId: string
	ownerAddress: string
	nomineeAddress: string
	lockedAmount: string
	inactivityTimeout: string
	createdAt: string
	claimedAt: string | null
	status: "ACTIVE" | "CLAIMABLE" | "CLAIMED"
}

export default function VaultsPage() {
	const { address } = useUnisat()
	const [vaults, setVaults] = useState<Vault[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetchVaults() {
			if (!address) {
				setLoading(false)
				return
			}

			try {
				const response = await fetch(`/api/vaults?address=${address}`)
				if (response.ok) {
					const data = await response.json()
					setVaults(data.vaults || [])
				}
			} catch (error) {
				console.error("Error fetching vaults:", error)
			} finally {
				setLoading(false)
			}
		}

		fetchVaults()

		// Refresh vaults every 10 seconds to check for status updates
		const interval = setInterval(fetchVaults, 10000)

		return () => clearInterval(interval)
	}, [address])

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<Header />

			<main className="flex-1 mx-auto max-w-5xl w-full space-y-6 px-4 py-8">
				<header className="space-y-2">
					<h1 className="text-2xl font-semibold">My Vaults as Heir</h1>
					<p className="text-sm text-muted-foreground">
						{address 
							? "Showing vaults where you are the nominated heir."
							: "Connect your wallet to view vaults where you are the heir."
						}
					</p>
				</header>

				{!address ? (
					<div className="rounded-md border bg-card p-8 text-center">
						<p className="text-muted-foreground">
							Please connect your wallet to view your vaults.
						</p>
					</div>
				) : loading ? (
					<div className="rounded-md border bg-card p-8 text-center">
						<p className="text-muted-foreground">Loading vaults...</p>
					</div>
				) : vaults.length === 0 ? (
					<div className="rounded-md border bg-card p-8 text-center">
						<p className="text-muted-foreground">
							No vaults found where you are the heir.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border bg-card">
						<table className="min-w-full text-sm">
							<thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="px-4 py-2">Tx ID</th>
									<th className="px-4 py-2">Owner</th>
									<th className="px-4 py-2">Amount (BTC)</th>
									<th className="px-4 py-2">Timeout</th>
									<th className="px-4 py-2">Status</th>
									<th className="px-4 py-2">Created</th>
									<th className="px-4 py-2">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{vaults.map((vault) => (
									<tr key={vault.id} className="hover:bg-muted/40">
										<td
											className="max-w-[200px] truncate px-4 py-2 font-mono text-xs"
											title={vault.txId}
										>
											{vault.txId}
										</td>
										<td
											className="max-w-[160px] truncate px-4 py-2 font-mono text-xs"
											title={vault.ownerAddress}
										>
											{vault.ownerAddress}
										</td>
										<td className="px-4 py-2">{vault.lockedAmount}</td>
										<td className="px-4 py-2">{vault.inactivityTimeout}</td>
										<td className="px-4 py-2">
											<span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
												vault.status === "ACTIVE" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
												vault.status === "CLAIMABLE" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
												"bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
											}`}>
												{vault.status}
											</span>
										</td>
										<td className="px-4 py-2">
											{vault.status === "CLAIMABLE" ? (
												<Link href={`/vaults/${vault.id}/claim`}>
													<Button size="sm" variant="default">Claim</Button>
												</Link>
											) : (
												<span className="text-xs text-muted-foreground">-</span>
											)}
										</td>
										<td className="px-4 py-2">{new Date(vault.createdAt).toISOString().slice(0, 16).replace("T", " ")}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</main>

			<Footer />
		</div>
	)
}
