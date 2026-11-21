import { NextResponse } from 'next/server';
import { getStore, addNotification } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * In-App Operational Notifications API
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 */

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    success: true,
    notifications: store.notifications || [],
    unreadCount: (store.notifications || []).filter((n) => !n.read).length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = getStore();

    if (body.markAllRead) {
      store.notifications.forEach((n) => {
        n.read = true;
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (body.notificationId) {
      const match = store.notifications.find((n) => n.id === body.notificationId);
      if (match) match.read = true;
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    if (body.title && body.message) {
      const notif = addNotification(body.title, body.message, body.category || 'INFO', body.actionUrl);
      return NextResponse.json({ success: true, notification: notif });
    }

    return NextResponse.json({ success: false, error: 'Invalid notification action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const store = getStore();
  store.notifications = [];
  return NextResponse.json({ success: true, message: 'Notifications cleared' });
}
