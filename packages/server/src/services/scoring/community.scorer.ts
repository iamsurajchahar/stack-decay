import { IHealthSnapshot } from '@stack-decay/shared';

const NEUTRAL_DEFAULT = 50;

/**
 * Score the community health of a package using log-scaled metrics.
 *
 * Sub-scores (0-100 each, log-scaled):
 * 1. Popularity (20%): based on stars count
 * 2. Growth (15%): based on stars growth in last 30 days
 * 3. Contributors (15%): based on contributor count
 * 4. Adoption (20%): based on dependent repos count
 * 5. Downloads (30%): based on weekly download count — most reliably available metric
 */
export function scoreCommunity(health: IHealthSnapshot): number {
  const c = health.community;

  // 1. Popularity: log-scaled stars
  const stars = c?.starsCount;
  let popularity: number;
  if (stars == null || stars === 0) {
    popularity = NEUTRAL_DEFAULT;
  } else {
    popularity = Math.min(100, (Math.log10(stars + 1) / Math.log10(100000)) * 100);
  }

  // 2. Growth: stars growth relative to total
  const starsGrowth = c?.starsGrowth30d;
  const starsCount = c?.starsCount;
  let growth: number;
  if (starsGrowth == null || starsCount == null || starsCount === 0) {
    growth = NEUTRAL_DEFAULT;
  } else {
    const base = Math.max(starsCount, 1);
    growth = clamp(50 + (starsGrowth / base) * 1000, 0, 100);
  }

  // 3. Contributors: log-scaled
  const contributors = c?.contributorCount;
  let contributorScore: number;
  if (contributors == null || contributors === 0) {
    contributorScore = NEUTRAL_DEFAULT;
  } else {
    contributorScore = Math.min(
      100,
      (Math.log10(contributors + 1) / Math.log10(500)) * 100,
    );
  }

  // 4. Adoption: log-scaled dependent repos
  const dependentRepos = c?.dependentReposCount;
  let adoption: number;
  if (dependentRepos == null || dependentRepos === 0) {
    adoption = NEUTRAL_DEFAULT;
  } else {
    adoption = Math.min(
      100,
      (Math.log10(dependentRepos + 1) / Math.log10(50000)) * 100,
    );
  }

  // 5. Downloads: log-scaled weekly downloads (most reliable metric from npm)
  const downloads = c?.downloadsLastWeek;
  let downloadScore: number;
  if (downloads == null || downloads === 0) {
    downloadScore = NEUTRAL_DEFAULT;
  } else {
    // Scale: 1k=40, 10k=53, 100k=67, 1M=80, 10M=93, 100M+=100
    downloadScore = Math.min(100, (Math.log10(downloads + 1) / Math.log10(150_000_000)) * 100);
  }

  // Weighted: downloads get 30% since it's the most reliably available metric
  const score =
    popularity * 0.20 +
    growth * 0.15 +
    contributorScore * 0.15 +
    adoption * 0.20 +
    downloadScore * 0.30;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
