'use client';

import { Order } from '@/lib/actions';

interface OrderProgressProps {
  order: Order;
}

export function OrderProgress({ order }: OrderProgressProps) {
  const steps = [
    {
      id: 'pending_payment',
      label: '支払い待ち',
      completed: order.status !== 'pending_payment',
    },
    {
      id: 'paid',
      label: '支払い済み',
      completed: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      id: 'processing',
      label: '処理中',
      completed: ['processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      id: 'shipped',
      label: '発送済み',
      completed: ['shipped', 'delivered'].includes(order.status),
      date: order.shipped_at,
    },
    {
      id: 'delivered',
      label: '配達済み',
      completed: order.status === 'delivered',
      date: order.delivered_at,
    },
  ];

  const currentStepIndex = steps.findIndex((step) => !step.completed);
  const activeStepIndex = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-700 mb-4">進捗状況</h4>
      <div className="relative">
        {/* プログレスバー */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="h-full bg-[#4a7c59] transition-all duration-500"
            style={{
              width: `${(activeStepIndex / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* ステップ */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isCompleted = step.completed;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                {/* ステップインジケーター */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#4a7c59] text-white'
                      : isActive
                      ? 'bg-[#4a7c59] text-white ring-4 ring-[#4a7c59]/20'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                {/* ラベル */}
                <div className="mt-3 text-center">
                  <p
                    className={`text-xs font-bold ${
                      isCompleted || isActive
                        ? 'text-[#323232]'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(step.date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

