import { redirect } from 'next/navigation'

// Fresh Finds is now the home page.
export default function FreshRedirect() {
  redirect('/')
}
