// app/components/StepIndicator.tsx
'use client';

export default function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
	<div className="mb-6 text-sm font-medium text-gray-700">
	  Step {current} of {total}
	</div>
  );
}
