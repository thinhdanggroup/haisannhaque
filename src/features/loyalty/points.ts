export type AwardedPointsInput = {
  grandTotal: number;
  rate: number;
};

export function calculateAwardedPoints(input: AwardedPointsInput): number {
  if (input.rate <= 0) {
    throw new Error("Point rate must be positive");
  }

  return Math.floor(input.grandTotal / input.rate);
}
