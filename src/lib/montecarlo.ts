// §7 예산 산출 (선택 경로): 수입·소비 입력 -> 몬테카를로 1,000회 -> 역산한 적정 월 예산.
// wayfinder #4 결정: 수익률 평균 7%/표준편차 9%(연), 물가상승률 2%(연) -- 화면에 노출하고 조정 가능하게 둔다.

function randomNormal(mean: number, stdev: number): number {
  // Box-Muller
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdev * z;
}

export type MonteCarloAssumptions = {
  annualReturnMean: number; // 0.07
  annualReturnStdev: number; // 0.09
  annualInflation: number; // 0.02
};

export const DEFAULT_ASSUMPTIONS: MonteCarloAssumptions = {
  annualReturnMean: 0.07,
  annualReturnStdev: 0.09,
  annualInflation: 0.02,
};

export type MonteCarloInput = {
  goalAmount: number;
  monthlyIncome: number;
  monthlyExpense: number;
  months: number; // 목표 기한
  assumptions?: MonteCarloAssumptions;
  runs?: number;
};

export type MonteCarloResult = {
  available: number; // income - expense: 쇼핑예산 + 저축의 원천
  recommendedSavings: number; // 역산된 월 저축액 (1000회 중 70%의 시나리오에서 충분한 값)
  recommendedBudget: number; // available - recommendedSavings, 0 이상으로 클램프
};

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const { goalAmount, monthlyIncome, monthlyExpense, months, runs = 1000 } = input;
  const { annualReturnMean, annualReturnStdev, annualInflation } =
    input.assumptions ?? DEFAULT_ASSUMPTIONS;

  const available = Math.max(0, monthlyIncome - monthlyExpense);
  const monthlyReturnMean = Math.pow(1 + annualReturnMean, 1 / 12) - 1;
  const monthlyReturnStdev = annualReturnStdev / Math.sqrt(12); // 연 표준편차의 월간 근사
  const monthlyInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;

  const inflationAdjustedGoal = goalAmount * Math.pow(1 + monthlyInflation, months);

  const requiredSavingsPerRun: number[] = [];
  for (let run = 0; run < runs; run++) {
    // growthSum = 매달 1원씩 넣었을 때 만기 시점까지 복리로 불어난 총합 (매달 다른 랜덤 수익률로)
    let growthSum = 0;
    let carry = 1;
    for (let m = months - 1; m >= 0; m--) {
      const r = randomNormal(monthlyReturnMean, monthlyReturnStdev);
      carry *= 1 + r;
      growthSum += carry;
    }
    requiredSavingsPerRun.push(inflationAdjustedGoal / growthSum);
  }

  requiredSavingsPerRun.sort((a, b) => a - b);
  const p70 = requiredSavingsPerRun[Math.floor(0.7 * (runs - 1))];
  const recommendedSavings = Math.min(available, Math.max(0, p70));
  const recommendedBudget = Math.max(0, available - recommendedSavings);

  return { available, recommendedSavings, recommendedBudget };
}
