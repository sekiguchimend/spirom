'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ContactSubmission {
  id: string;
  user_id: string;
  name: string;
  email: string;
  inquiry_type: string;
  order_number: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
  ip_address: string | null;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unread: { label: '未読', color: 'bg-red-100 text-red-700' },
  read: { label: '既読', color: 'bg-blue-100 text-blue-700' },
  replied: { label: '返信済', color: 'bg-green-100 text-green-700' },
  resolved: { label: '解決済', color: 'bg-gray-100 text-gray-700' },
  spam: { label: 'スパム', color: 'bg-yellow-100 text-yellow-700' },
};

const TYPE_LABELS: Record<string, string> = {
  order: '注文',
  product: '商品',
  shipping: '配送',
  return: '返品',
  other: 'その他',
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [filterStatus]);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      params.set('limit', '100');

      const res = await fetch(`/api/v1/admin/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string, notes?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/admin/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: notes }),
      });

      if (res.ok) {
        const updated = await res.json();
        setContacts(prev => prev.map(c => c.id === id ? updated : c));
        if (selectedContact?.id === id) {
          setSelectedContact(updated);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const unreadCount = contacts.filter(c => c.status === 'unread').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">お問い合わせ管理</h1>
          <p className="text-gray-600 mt-1">
            {contacts.length} 件のお問い合わせ
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount} 件未読
              </span>
            )}
          </p>
        </div>

        {/* フィルター */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg font-bold"
        >
          <option value="">すべて</option>
          <option value="unread">未読</option>
          <option value="read">既読</option>
          <option value="replied">返信済</option>
          <option value="resolved">解決済</option>
          <option value="spam">スパム</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-gray-500">お問い合わせがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 一覧 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact);
                    if (contact.status === 'unread') {
                      updateStatus(contact.id, 'read');
                    }
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  } ${contact.status === 'unread' ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${STATUS_LABELS[contact.status]?.color || 'bg-gray-100'}`}>
                          {STATUS_LABELS[contact.status]?.label || contact.status}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {TYPE_LABELS[contact.inquiry_type] || contact.inquiry_type}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 truncate">{contact.name}</p>
                      <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{contact.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(contact.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 詳細 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {selectedContact ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900">詳細</h2>
                  <select
                    value={selectedContact.status}
                    onChange={(e) => updateStatus(selectedContact.id, e.target.value)}
                    disabled={isUpdating}
                    className={`px-3 py-1.5 rounded-lg font-bold text-sm ${STATUS_LABELS[selectedContact.status]?.color || 'bg-gray-100'}`}
                  >
                    <option value="unread">未読</option>
                    <option value="read">既読</option>
                    <option value="replied">返信済</option>
                    <option value="resolved">解決済</option>
                    <option value="spam">スパム</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">ユーザーID</p>
                    <p className="text-sm text-gray-600 font-mono">{selectedContact.user_id}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">名前</p>
                    <p className="font-bold text-gray-900">{selectedContact.name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">メールアドレス</p>
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="font-bold text-blue-600 hover:underline"
                    >
                      {selectedContact.email}
                    </a>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">種別</p>
                    <p className="font-bold text-gray-900">
                      {TYPE_LABELS[selectedContact.inquiry_type] || selectedContact.inquiry_type}
                    </p>
                  </div>

                  {selectedContact.order_number && (
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">注文番号</p>
                      <p className="font-bold text-gray-900">{selectedContact.order_number}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">メッセージ</p>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedContact.message}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2">タイムスタンプ</p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>受信: {formatDate(selectedContact.created_at)}</p>
                      {selectedContact.read_at && (
                        <p>既読: {formatDate(selectedContact.read_at)}</p>
                      )}
                      {selectedContact.replied_at && (
                        <p>返信: {formatDate(selectedContact.replied_at)}</p>
                      )}
                    </div>
                  </div>

                  {selectedContact.ip_address && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-500 font-bold uppercase">IPアドレス</p>
                      <p className="text-sm text-gray-600 font-mono">{selectedContact.ip_address}</p>
                    </div>
                  )}

                  {/* 返信ボタン */}
                  <div className="pt-4">
                    <a
                      href={`mailto:${selectedContact.email}?subject=Re: お問い合わせありがとうございます - Spirom`}
                      onClick={() => {
                        if (selectedContact.status !== 'replied') {
                          updateStatus(selectedContact.id, 'replied');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                      メールで返信
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>左のリストからお問い合わせを選択してください</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
