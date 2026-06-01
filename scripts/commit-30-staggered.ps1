$ErrorActionPreference = "Stop"
Set-Location "d:\route\PHANTOM Protocol"

$groups = @(
  @(".gitignore"),
  @("render.yaml"),
  @("bot/Dockerfile", "bot/.dockerignore", "bot/fly.toml"),
  @("bot/rpc.ts"),
  @("bot/cofhe.ts"),
  @("bot/keeper.ts"),
  @("bot/README.md", "bot/cli.ts"),
  @("bot/seed-markets.ts", "bot/seed-multi-markets.ts"),
  @("README.md", "about.md"),
  @("frontend/src/lib/viemDecode.ts"),
  @("frontend/src/lib/cofheDecrypt.ts"),
  @("frontend/src/lib/fhe.ts"),
  @("frontend/src/lib/roundsDisplay.ts"),
  @("frontend/src/config/multi-market-metadata.ts"),
  @("frontend/src/config/market-metadata.ts"),
  @("frontend/src/config/contracts.ts"),
  @("frontend/src/hooks/useMultiMarkets.ts", "frontend/src/hooks/usePhantomMulti.ts"),
  @("frontend/src/hooks/useRevealMultiChoice.ts"),
  @("frontend/src/hooks/useDecryptMultiBet.ts", "frontend/src/hooks/useRevealBetSide.ts", "frontend/src/hooks/useRevealRoundDirection.ts", "frontend/src/hooks/useDecryptPosition.ts"),
  @("frontend/src/components/markets/MarketCharts.tsx", "frontend/src/pages/MarketDetail.tsx"),
  @("frontend/src/components/rounds/FhePrivacyBanner.tsx", "frontend/src/components/rounds/LiveRoundBoard.tsx", "frontend/src/components/rounds/ClaimStepper.tsx"),
  @("frontend/src/pages/Rounds.tsx"),
  @("frontend/src/App.tsx", "frontend/src/components/shared/Navbar.tsx", "frontend/src/pages/Multi.tsx"),
  @("frontend/src/pages/Markets.tsx"),
  @("frontend/src/components/markets/BetInterface.tsx"),
  @("frontend/src/components/markets/PositionPanel.tsx", "frontend/src/pages/Positions.tsx"),
  @("frontend/src/components/rounds/RoundPositionActions.tsx"),
  @("frontend/src/components/landing/LiveProtocolSection.tsx", "frontend/src/pages/Index.tsx", "frontend/src/components/landing/HeroSection.tsx", "frontend/src/components/landing/FeaturesSection.tsx", "frontend/src/components/landing/NumbersSection.tsx", "frontend/src/components/landing/ReverseChessSection.tsx", "frontend/src/components/landing/RoadmapSection.tsx"),
  @("frontend/src/pages/Docs.tsx"),
  @("scripts/commit-30-staggered.ps1")
)

$messages = @(
  "chore: track render.yaml for keeper blueprint",
  "feat: add Render blueprint for phantom-keeper",
  "feat(bot): Docker and Fly deploy config",
  "feat(bot): Arbitrum RPC fallback transport",
  "fix(bot): CoFHE decrypt uses decryptedValue field",
  "feat(bot): keeper v3 round window and Coinbase fallback",
  "docs(bot): README and CLI lifecycle tools",
  "feat(bot): seed Bet and Multi markets on-chain",
  "docs: v2 deployed contract addresses",
  "fix(frontend): viem tuple decode helpers",
  "feat(frontend): CoFHE decrypt view and tx helpers",
  "feat(frontend): auto-create EIP-712 permit on connect",
  "feat(frontend): live rounds display filters",
  "feat(frontend): multi-outcome market metadata",
  "feat(frontend): expand market metadata catalog",
  "feat(frontend): v2 contract ABIs and addresses",
  "fix(frontend): multi market pool reads",
  "feat(frontend): useRevealMultiChoice hook",
  "fix(frontend): decryptForTx signatures for claims",
  "feat(frontend): market detail page with charts",
  "feat(frontend): rounds privacy and live board UI",
  "feat(frontend): rounds page three-asset live UX",
  "feat(frontend): remove multi nav and redirect route",
  "refactor(frontend): markets layout without modules sidebar",
  "fix(frontend): refresh markets after bet receipt",
  "feat(frontend): position panel stake and claim flow",
  "feat(frontend): round position claim stepper",
  "feat(landing): live protocol copy and module roadmap",
  "docs: PHANTOM protocol reference on Fhenix CoFHE",
  "chore: add staggered release commit script"
)

if ($groups.Count -ne 30 -or $messages.Count -ne 30) {
  throw "Expected 30 commit groups"
}

$baseTime = [DateTime]::UtcNow.AddMinutes(-29 * 5)
for ($i = 0; $i -lt 30; $i++) {
  $d = $baseTime.AddMinutes(5 * $i)
  $ds = $d.ToString("yyyy-MM-ddTHH:mm:ss")
  $env:GIT_AUTHOR_DATE = $ds
  $env:GIT_COMMITTER_DATE = $ds
  $existing = @($groups[$i] | Where-Object { Test-Path $_ })
  if ($existing.Count -eq 0) { Write-Host "skip missing: $($groups[$i] -join ', ')"; continue }
  git add @existing
  git commit -m $messages[$i]
  Write-Host "[$($i+1)/30] $($messages[$i]) @ $ds"
}

Write-Host "Pushing (force-with-lease)..."
git push --force-with-lease origin main
