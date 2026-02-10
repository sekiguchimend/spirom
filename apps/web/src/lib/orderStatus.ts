/**
 * 注文ステータス表示用の共通ユーティリティ
 * - ページごとの重複を避ける
 */

export function getOrderStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending_payment: '作成待ち',
    paid: '作成済み',
    processing: '処理中',
    shipped: '発送済み',
    delivered: '配達済み',
    cancelled: 'キャンセル済み',
    refunded: '返金済み',
  };
  return statusMap[status] || status;
}

export function getOrderStatusBadgeClass(status: string): string {
  const colorMap: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}


