import { NextRequest } from 'next/server'

type Role = 'read' | 'write'

export async function requireAdmin(req: NextRequest, role: Role = 'read') {
  const token = req.headers.get('x-admin-token')
  if (!token || token !== process.env.ADMIN_API_TOKEN) {
    throw new Error('Forbidden')
  }

  // أبسط تطبيق للأدوار (قابل للتوسعة لاحقًا)
  const writeToken = process.env.ADMIN_WRITE_TOKEN
  if (role === 'write' && token !== writeToken) {
    throw new Error('Write access required')
  }
}
