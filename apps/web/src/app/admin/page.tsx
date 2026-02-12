'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [productsRes, ordersRes, usersRes] = await Promise.all([
          fetch('/api/v1/products?limit=1'),
          fetch('/api/v1/admin/orders?limit=100'),
          fetch('/api/v1/admin/users?limit=100'),
        ]);

        const productsData = productsRes.ok ? await productsRes.json() : { total: 0 };
        const ordersData = ordersRes.ok ? await ordersRes.json() : { data: [] };
        const usersData = usersRes.ok ? await usersRes.json() : { data: [] };

        const orders = ordersData.data || [];
        const pendingOrders = orders.filter((o: { status: string }) => o.status === 'pending').length;

        setStats({
          totalProducts: productsData.total || productsData.data?.length || 0,
          totalOrders: orders.length,
          pendingOrders,
          totalUsers: usersData.data?.length || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      title: '商品数',
      value: stats.totalProducts,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      href: '/admin/products',
      color: 'bg-blue-500',
    },
    {
      title: '総注文数',
      value: stats.totalOrders,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      href: '/admin/orders',
      color: 'bg-green-500',
    },
    {
      title: '処理待ち',
      value: stats.pendingOrders,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      href: '/admin/orders?status=pending',
      color: 'bg-yellow-500',
    },
    {
      title: 'ユーザー数',
      value: stats.totalUsers,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
      href: '/admin/users',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">ダッシュボード</h1>
        <p className="text-gray-600 mt-1">管理画面へようこそ</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white`}>
                {card.icon}
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">{card.title}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">
              {isLoading ? '...' : card.value.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      {/* クイックアクション */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-3 p-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="font-bold">新規商品を追加</span>
          </Link>
          <Link
            href="/admin/orders?status=pending"
            className="flex items-center gap-3 p-4 bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="font-bold">処理待ち注文を確認</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 p-4 bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span className="font-bold">サイトを確認</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
