import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'

export function formResolver(schema: unknown): Resolver<any> {
  return zodResolver(schema as never) as unknown as Resolver<any>
}
