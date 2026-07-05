export function calculerAmende(joursRetard: number) {
  if (joursRetard <= 0) {
    return 0;
  }

  if (joursRetard <= 7) {
    return 300;
  }

  if (joursRetard <= 14) {
    return 500;
  }

  return 800;
}

export function calculateDaysLate(
  expectedEndDate: Date,
  actualEndDate = new Date()
) {
  const diffMs = actualEndDate.getTime() - expectedEndDate.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}
