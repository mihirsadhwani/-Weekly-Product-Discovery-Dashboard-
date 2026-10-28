'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { DATA_TAG } from '@/lib/products'

export async function refreshData() {
  revalidateTag(DATA_TAG)
  revalidatePath('/', 'layout')
}
